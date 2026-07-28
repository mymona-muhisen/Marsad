/** CLAUDE.md: compress client-side to roughly 300KB before upload. */
const TARGET_BYTES = 300 * 1024

/** Long edge cap. Plate digits and damage detail survive comfortably at 1600px. */
const MAX_DIMENSION = 1600

const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5, 0.4]

const COMPRESSIBLE = new Set(['image/jpeg', 'image/jpg', 'image/png'])

function scaledSize(width: number, height: number) {
  const longEdge = Math.max(width, height)
  if (longEdge <= MAX_DIMENSION) return { width, height }

  const ratio = MAX_DIMENSION / longEdge
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

/**
 * Shrinks a captured photo to about 300KB.
 *
 * Every failure path returns the original file rather than throwing: a phone
 * that cannot decode the image in a canvas must still be able to file the
 * report, and the backend accepts up to 5MB per photo anyway. Compression is
 * an optimisation for bad networks, never a gate on submitting.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type)) return file
  if (file.size <= TARGET_BYTES) return file
  if (typeof createImageBitmap !== 'function') return file

  try {
    // `from-image` applies the EXIF rotation, so portrait photos taken on a
    // phone are not silently uploaded sideways.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    })

    const { width, height } = scaledSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    let smallest: Blob | null = null
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality)
      if (!blob) continue
      smallest = blob
      if (blob.size <= TARGET_BYTES) break
    }

    // Re-encoding can grow an already-efficient file; keep whichever is smaller.
    if (!smallest || smallest.size >= file.size) return file

    return new File([smallest], toJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'photo'
  return `${base}.jpg`
}

export const __testing = { TARGET_BYTES, MAX_DIMENSION }
