import { NextRequest } from "next/server";
import { Country, State } from "country-state-city";
import { handle, ok } from "@/lib/api-utils";

/**
 * GET /api/geo                      → every country (ISO code + name + flag)
 * GET /api/geo?country=NG           → states/provinces of that country
 *
 * Backed by the country-state-city dataset (250 countries, ~5,000 states).
 * Lightweight payloads: the client only needs codes + names.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const { searchParams } = new URL(req.url);
    const countryIso = searchParams.get("country");

    if (countryIso) {
      const states = State.getStatesOfCountry(countryIso).map((s) => ({
        code: s.isoCode,
        name: s.name,
      }));
      return ok({ country: countryIso, states });
    }

    const countries = Country.getAllCountries().map((c) => ({
      code: c.isoCode,
      name: c.name,
      flag: c.flag,
      phone: c.phonecode,
    }));
    // Sort alphabetically so the picker is easy to scan
    countries.sort((a, b) => a.name.localeCompare(b.name));
    return ok({ countries });
  });
}
