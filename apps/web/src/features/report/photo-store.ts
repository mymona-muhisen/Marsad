const DB_NAME = 'marsad-report'
const DB_VERSION = 1
const STORE = 'photos'
const KEY = 'draft'

/**
 * Draft photo storage.
 *
 * The wizard's text fields go to localStorage, but photos cannot: four to eight
 * compressed shots are 1.5–3MB once base64-encoded, which is most of the
 * 5MB localStorage quota. IndexedDB stores the blobs natively at their real
 * size, and losing photos a stressed user just took at a crash site is the one
 * failure this wizard must not have.
 *
 * Every operation resolves rather than rejects: private-mode browsers and
 * locked-down Android WebViews block IndexedDB outright, and a lost draft is a
 * far better outcome than a wizard that will not open.
 */
function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
  fallback: T,
): Promise<T> {
  const db = await openDb()
  if (!db) return fallback

  return new Promise<T>((resolve) => {
    try {
      const tx = db.transaction(STORE, mode)
      const request = run(tx.objectStore(STORE))
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => resolve(fallback)
      tx.oncomplete = () => db.close()
    } catch {
      db.close()
      resolve(fallback)
    }
  })
}

export async function savePhotos(files: File[]): Promise<void> {
  await withStore('readwrite', (store) => store.put(files, KEY), undefined)
}

export async function loadPhotos(): Promise<File[]> {
  const stored = await withStore<unknown>('readonly', (s) => s.get(KEY), null)

  if (!Array.isArray(stored)) return []
  // A schema change between sessions could leave anything here.
  return stored.filter((item): item is File => item instanceof File)
}

export async function clearPhotos(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(KEY), undefined)
}
