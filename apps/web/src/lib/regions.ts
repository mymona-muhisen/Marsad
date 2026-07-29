/**
 * Syria's 14 governorates with their capital's coordinates.
 *
 * Used as the location fallback when a device fix is unavailable: picking a
 * governorate yields valid coordinates for the heatmap and black-spot analytics
 * (which group by `region` and index `lat`/`lng`), while the written address the
 * reporter types alongside it carries the precision a surveyor actually needs.
 *
 * Coordinates are city-scale on purpose. A case saved this way is always stored
 * with `location_verified = false` so nothing downstream mistakes it for GPS.
 */
export type Region = {
  code: string
  /**
   * Stored verbatim in `accident_cases.region`. Two things consume it: the
   * heatmap/black-spot analytics group on it, and `DispatchService` matches it
   * against `users.zone` for zone-based surveyor routing (FR-C5). The pilot
   * zone list in `apps/api/config/zones.php` must use these exact strings —
   * the dispatcher falls back to any free surveyor when nothing matches, so a
   * mismatch disables zone routing silently rather than failing.
   */
  ar: string
  en: string
  lat: number
  lng: number
}

export const REGIONS: readonly Region[] = [
  { code: 'damascus', ar: 'دمشق', en: 'Damascus', lat: 33.5138, lng: 36.2765 },
  { code: 'rif_dimashq', ar: 'ريف دمشق', en: 'Rif Dimashq', lat: 33.6500, lng: 36.5500 },
  { code: 'aleppo', ar: 'حلب', en: 'Aleppo', lat: 36.2021, lng: 37.1343 },
  { code: 'homs', ar: 'حمص', en: 'Homs', lat: 34.7324, lng: 36.7137 },
  { code: 'hama', ar: 'حماة', en: 'Hama', lat: 35.1318, lng: 36.7578 },
  { code: 'latakia', ar: 'اللاذقية', en: 'Latakia', lat: 35.5196, lng: 35.7915 },
  { code: 'tartus', ar: 'طرطوس', en: 'Tartus', lat: 34.8890, lng: 35.8866 },
  { code: 'idlib', ar: 'إدلب', en: 'Idlib', lat: 35.9306, lng: 36.6339 },
  { code: 'deir_ez_zor', ar: 'دير الزور', en: 'Deir ez-Zor', lat: 35.3359, lng: 40.1408 },
  { code: 'raqqa', ar: 'الرقة', en: 'Raqqa', lat: 35.9594, lng: 39.0079 },
  { code: 'hasakah', ar: 'الحسكة', en: 'Al-Hasakah', lat: 36.5024, lng: 40.7477 },
  { code: 'daraa', ar: 'درعا', en: 'Daraa', lat: 32.6189, lng: 36.1021 },
  { code: 'suwayda', ar: 'السويداء', en: 'As-Suwayda', lat: 32.7094, lng: 36.5695 },
  { code: 'quneitra', ar: 'القنيطرة', en: 'Quneitra', lat: 33.1256, lng: 35.8239 },
]

export function findRegion(code: string): Region | undefined {
  return REGIONS.find((region) => region.code === code)
}

export function regionLabel(region: Region, locale: string): string {
  return locale === 'en' ? region.en : region.ar
}
