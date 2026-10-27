// Country/state reference data for centre (location) scoping.
// Dataset: scripts/gen-geo-data.mjs → countries-states.json (250 countries, ~4.9k first-level divisions).
// Server-side only — the client consumes it through GET /api/geo.
import raw from "./geo/countries-states.json";

export interface GeoCountry {
  iso2: string;
  name: string;
  states: string[];
}

export const GEO_COUNTRIES = raw as GeoCountry[];

const byName = new Map(GEO_COUNTRIES.map((c) => [c.name.toLowerCase(), c]));
const byIso = new Map(GEO_COUNTRIES.map((c) => [c.iso2.toLowerCase(), c]));

/** Find a country by its name ("Nigeria") or ISO2 code ("NG"), case-insensitive. */
export function findGeoCountry(nameOrIso: string): GeoCountry | null {
  const q = (nameOrIso || "").trim().toLowerCase();
  if (!q) return null;
  return byName.get(q) || byIso.get(q) || null;
}

/** States of a country (matched by name or iso2); null when the country is unknown. */
export function geoStatesFor(nameOrIso: string): string[] | null {
  const c = findGeoCountry(nameOrIso);
  return c ? c.states : null;
}

/** Validate a country/state pair. Returns an error string or null when valid. */
export function validateGeoPair(country: string, state: string): string | null {
  const c = findGeoCountry(country);
  if (!c) return "Unknown country — pick one from the list";
  if (state && !c.states.includes(state)) return `“${state}” is not a known state of ${c.name}`;
  return null;
}
