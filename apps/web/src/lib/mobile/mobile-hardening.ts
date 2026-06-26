export const MOBILE_VIEWPORT_AUDIT_WIDTHS = [360, 390, 430] as const;

export const MIN_TOUCH_TARGET_PX = 44;

export const MOBILE_NAVIGATION_LABELS = [
  "Panou",
  "Clienți",
  "Oferte",
  "Catalog",
] as const;

export const MOBILE_QUOTE_ACTION_LABELS = [
  "Total curent",
  "Previzualizare",
  "Recalculează",
  "Generează PDF",
  "Revizie",
] as const;

export const MOBILE_STATE_LABELS = [
  "Se încarcă spațiul de lucru",
  "Nu am putut încărca acest ecran",
  "Nu există oferte salvate încă",
  "Nu există clienți încă",
] as const;

export function isAuditedMobileViewport(width: number) {
  return MOBILE_VIEWPORT_AUDIT_WIDTHS.includes(
    width as (typeof MOBILE_VIEWPORT_AUDIT_WIDTHS)[number],
  );
}
