export function toChatBotMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function toChatBotCountryLabel(country: { name: string; code: string }): string {
  return `${country.name} (${country.code})`;
}
