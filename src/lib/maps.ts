/** Gera a URL de busca do Google Maps para um endereço em texto livre. */
export function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
