/** Logo del dashboard: Supabase branding o archivo estático por defecto. */
export const DEFAULT_AGM_LOGO = "/agm-logo.png";

export function resolveDashboardLogoUrl(storageUrl: string | null | undefined): string {
  return storageUrl?.trim() || DEFAULT_AGM_LOGO;
}
