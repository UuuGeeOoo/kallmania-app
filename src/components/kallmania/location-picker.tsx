"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { api, flagEmoji, type GeoCountryLite } from "@/lib/client";
import { Check, ChevronsUpDown, Globe2, MapPin } from "lucide-react";

// ── module-level cache: countries are static reference data, fetch once per session ──
let countriesCache: GeoCountryLite[] | null = null;
let countriesPromise: Promise<GeoCountryLite[]> | null = null;

function fetchCountries(): Promise<GeoCountryLite[]> {
  if (countriesCache) return Promise.resolve(countriesCache);
  if (!countriesPromise) {
    countriesPromise = api<{ countries: GeoCountryLite[] }>("/api/geo").then((d) => {
      // /api/geo returns { code, name, flag, phone } — derive the iso2 alias
      // the pickers/UI helpers rely on.
      countriesCache = d.countries.map((c) => ({ ...c, iso2: c.code }));
      return countriesCache;
    });
  }
  return countriesPromise;
}

const statesCache = new Map<string, string[]>();

export function fetchStates(country: string): Promise<string[]> {
  const key = country.trim().toLowerCase();
  if (statesCache.has(key)) return Promise.resolve(statesCache.get(key)!);
  return api<{ states: string[] }>(`/api/geo?country=${encodeURIComponent(country)}`).then((d) => {
    statesCache.set(key, d.states);
    return d.states;
  });
}

/** Countries list hook — shared by registration, admin location dialog and the KPI scope bar. */
export function useGeoCountries() {
  const [countries, setCountries] = useState<GeoCountryLite[]>(countriesCache || []);
  useEffect(() => {
    if (countriesCache) return;
    let cancelled = false;
    fetchCountries().then((cs) => !cancelled && setCountries(cs)).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return countries;
}

/** States list hook for the currently selected country. */
export function useGeoStates(country: string) {
  const [entry, setEntry] = useState<{ country: string; states: string[] }>(() =>
    country ? { country, states: statesCache.get(country.trim().toLowerCase()) || [] } : { country: "", states: [] }
  );
  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    fetchStates(country)
      .then((ss) => { if (!cancelled) setEntry({ country, states: ss }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [country]);
  return entry.country === country ? entry.states : [];
}

/** Country name → ISO2 map (for flag display next to stored country names). */
export function useCountryIsoMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(() =>
    countriesCache ? Object.fromEntries(countriesCache.map((c) => [c.name, c.iso2])) : {}
  );
  useEffect(() => {
    if (countriesCache) return;
    let cancelled = false;
    fetchCountries()
      .then((cs) => { if (!cancelled) setMap(Object.fromEntries(cs.map((c) => [c.name, c.iso2]))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return map;
}

const comboBtnCls = "justify-between border-white/12 bg-white/[0.055] font-normal backdrop-blur hover:bg-white/10";

/** Searchable country combobox (flag + name). */
export function CountryCombobox({
  value,
  onChange,
  placeholder = "Select country…",
  clearOption,
  className,
  disabled,
}: {
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  /** Optional reset row, e.g. "All centres (global KPIs)" — shown at the top. */
  clearOption?: string;
  className?: string;
  disabled?: boolean;
}) {
  const countries = useGeoCountries();
  const [open, setOpen] = useState(false);
  const selected = countries.find((c) => c.name === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={`${comboBtnCls} ${className || "w-full"}`}>
          <span className="flex min-w-0 items-center gap-1.5">
            {clearOption && !value ? <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#8b7ff5]" /> : <span className="shrink-0">{selected?.flag || "🌐"}</span>}
            <span className="truncate">{value || (clearOption ? clearOption : placeholder)}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[290px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {clearOption && (
              <CommandGroup>
                <CommandItem value="__all__" onSelect={() => { onChange(""); setOpen(false); }}>
                  <Globe2 className="mr-2 h-4 w-4 text-[#8b7ff5]" />
                  {clearOption}
                  {!value && <Check className="ml-auto h-4 w-4 text-[#8b7ff5]" />}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {countries.map((c) => (
                <CommandItem
                  key={c.iso2}
                  value={`${c.name} ${c.iso2}`}
                  onSelect={() => { onChange(c.name); setOpen(false); }}
                >
                  <span className="mr-2">{c.flag}</span>
                  {c.name}
                  <Check className={`ml-auto h-4 w-4 ${value === c.name ? "opacity-100" : "opacity-0"}`} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** State/province combobox — cascades from the selected country. */
export function StateCombobox({
  country,
  value,
  onChange,
  placeholder = "Select state…",
  clearOption,
  className,
}: {
  country: string;
  value: string;
  onChange: (state: string) => void;
  placeholder?: string;
  clearOption?: string;
  className?: string;
}) {
  const states = useGeoStates(country);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={!country} className={`${comboBtnCls} ${className || "w-full"}`}>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#8b7ff5]" />
            <span className="truncate">{value || (country ? (clearOption && !value ? clearOption : placeholder) : "Choose country first")}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[290px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search state…" />
          <CommandList>
            <CommandEmpty>No state found.</CommandEmpty>
            {clearOption && (
              <CommandGroup>
                <CommandItem value="__whole__" onSelect={() => { onChange(""); setOpen(false); }}>
                  <Globe2 className="mr-2 h-4 w-4 text-[#8b7ff5]" />
                  {clearOption}
                  {!value && <Check className="ml-auto h-4 w-4 text-[#8b7ff5]" />}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {states.map((s) => (
                <CommandItem key={s} value={s} onSelect={() => { onChange(s); setOpen(false); }}>
                  <span className="mr-2"><MapPin className="h-3.5 w-3.5 opacity-60" /></span>
                  {s}
                  <Check className={`ml-auto h-4 w-4 ${value === s ? "opacity-100" : "opacity-0"}`} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
