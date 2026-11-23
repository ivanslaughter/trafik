export const GTM_CONTAINER_ID = 'GTM-WMV253CC';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function pushGtmEvent(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...params,
  });
}

export function pushGtmPageView(pagePath: string, pageTitle: string): void {
  if (typeof window === 'undefined') return;
  const pageLocation = `${window.location.origin}${pagePath}`;
  pushGtmEvent('virtual_page_view', {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: pageLocation,
  });
}
