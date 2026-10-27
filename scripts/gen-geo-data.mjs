// Generates src/lib/geo/countries-states.json from the country-state-city package:
// all ISO countries + first-level divisions (states/provinces/regions) with dedup.
import { Country, State } from "country-state-city";
import { writeFileSync, mkdirSync } from "node:fs";

const out = [];
for (const c of Country.getAllCountries()) {
  const states = [
    ...new Set(
      (State.getStatesOfCountry(c.isoCode) || [])
        .map((s) => s.name.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
  out.push({ iso2: c.isoCode, name: c.name, states });
}
out.sort((a, b) => a.name.localeCompare(b.name));

mkdirSync(new URL("../src/lib/geo/", import.meta.url).pathname, { recursive: true });
const target = new URL("../src/lib/geo/countries-states.json", import.meta.url).pathname;
writeFileSync(target, JSON.stringify(out));
const totalStates = out.reduce((s, c) => s + c.states.length, 0);
console.log(`countries=${out.length} totalStates=${totalStates} → ${target}`);
const ng = out.find((c) => c.iso2 === "NG");
console.log("Nigeria states sample:", ng?.states.slice(0, 5).join(", "), "… total", ng?.states.length);
const gh = out.find((c) => c.iso2 === "GH");
console.log("Ghana sample:", gh?.states.slice(0, 4).join(", "));
const ke = out.find((c) => c.iso2 === "KE");
console.log("Kenya sample:", ke?.states.slice(0, 4).join(", "));
