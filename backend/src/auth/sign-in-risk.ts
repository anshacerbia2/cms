/**
 * Tanda login yang perlu dilihat orang - insiden 19 Okt 2026: akun finance@
 * dipakai dari curl dan Python-urllib, dari IP yang belum pernah dipakai
 * akun itu, dan tidak ada yang tahu sampai keesokan paginya.
 */

/** Tool yang biasa dipakai untuk scraping; browser sungguhan tidak pernah membawa nama ini. */
const NON_BROWSER_AGENT =
  /curl|wget|python|go-http|java\/|okhttp|httpclient|axios|node-fetch|undici|postman|insomnia|httpie|scrapy|libwww|headless/i;

/** User-Agent yang tidak seperti browser. Bisa dipalsukan - ini penanda, bukan pengaman. */
export function isNonBrowserAgent(userAgent: string): boolean {
  return !userAgent.startsWith('Mozilla/5.0') || NON_BROWSER_AGENT.test(userAgent);
}

/**
 * Jaringan sebuah IP: /24 untuk IPv4, /64 untuk IPv6. IP rumah dan kantor
 * sering berganti angka terakhirnya; yang dibandingkan jaringannya.
 */
export function networkOf(ip: string): string {
  const v4 = ip.replace(/^::ffff:/i, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.split('.').slice(0, 3).join('.');
  return ip.toLowerCase().split(':').slice(0, 4).join(':');
}

/** IP ini belum pernah dipakai akun tersebut (dalam daftar IP yang diketahui). */
export function isNewNetwork(ip: string, knownIps: string[]): boolean {
  const net = networkOf(ip);
  return !knownIps.some((k) => networkOf(k) === net);
}
