import { ImportCostBreakdown, CarListing } from './types';

export const SHIPPING_DEFAULTS: Record<string, number> = {
  sedan: 1400.0,
  suv: 1600.0,
  hatchback: 1350.0,
  wagon: 1450.0,
  pickup: 1700.0,
  minivan: 1550.0,
  coupe: 1350.0,
  default: 1500.0,
};

let cachedExchangeRate = 129.50;
let lastExchangeFetch = 0;

export async function getUsdKesRate(): Promise<number> {
  const now = Date.now();
  if (now - lastExchangeFetch < 3600_000 && cachedExchangeRate > 0) {
    return cachedExchangeRate;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json() as { rates?: { KES?: number } };
      if (data?.rates?.KES && typeof data.rates.KES === 'number') {
        cachedExchangeRate = data.rates.KES;
        lastExchangeFetch = now;
        return cachedExchangeRate;
      }
    }
  } catch (err) {
    console.warn('Using fallback exchange rate 129.50:', err);
  }
  return cachedExchangeRate;
}

export function calculateImportCost(
  purchase_usd: number,
  body_type: string = 'sedan',
  shipping_usd?: number | null,
  usd_kes: number = 129.50,
  clearing_agent_kes: number = 40_000.0,
): ImportCostBreakdown {
  const normalizedBody = (body_type || 'default').toLowerCase();
  const ship_usd = shipping_usd && shipping_usd > 0
    ? shipping_usd
    : (SHIPPING_DEFAULTS[normalizedBody] || SHIPPING_DEFAULTS.default);

  const insurance_usd = Math.round(purchase_usd * 0.015 * 100) / 100;
  const cif_usd = purchase_usd + ship_usd + insurance_usd;
  const cif_kes = Math.round(cif_usd * usd_kes * 100) / 100;

  // KRA 2024 Schedule
  const customs = Math.round(cif_kes * 0.25 * 100) / 100; // 25% CIF
  const excise = Math.round((cif_kes + customs) * 0.20 * 100) / 100; // 20% (CIF + customs)
  const vat = Math.round((cif_kes + customs + excise) * 0.16 * 100) / 100; // 16%
  const idf = Math.round(Math.max(cif_kes * 0.035, 5_000) * 100) / 100; // 3.5% min 5k
  const rdl = Math.round(cif_kes * 0.02 * 100) / 100; // 2.0%

  const tax_total = customs + excise + vat + idf + rdl;

  // Port and local charges
  const port_cfs = 35_000.0;
  const ntsa_inspect = 5_000.0;
  const plates = 3_500.0;
  const comp_ins = Math.round(purchase_usd * usd_kes * 0.03 * 100) / 100; // 3% vehicle value

  const charges_total = port_cfs + clearing_agent_kes + ntsa_inspect + plates + comp_ins;
  const total_kes = cif_kes + tax_total + charges_total;
  const total_usd = Math.round((total_kes / usd_kes) * 100) / 100;

  return {
    purchase_usd: Math.round(purchase_usd * 100) / 100,
    shipping_usd: ship_usd,
    insurance_usd,
    cif_usd: Math.round(cif_usd * 100) / 100,
    usd_kes_rate: usd_kes,
    cif_kes: Math.round(cif_kes * 100) / 100,
    customs_duty_kes: Math.round(customs * 100) / 100,
    excise_duty_kes: Math.round(excise * 100) / 100,
    vat_kes: Math.round(vat * 100) / 100,
    idf_levy_kes: Math.round(idf * 100) / 100,
    rdl_levy_kes: Math.round(rdl * 100) / 100,
    port_cfs_kes: port_cfs,
    clearing_agent_kes,
    ntsa_inspection_kes: ntsa_inspect,
    number_plates_kes: plates,
    comprehensive_ins_kes: Math.round(comp_ins * 100) / 100,
    total_import_kes: Math.round(total_kes),
    total_import_usd: total_usd,
    tax_total_kes: Math.round(tax_total),
    charges_total_kes: Math.round(charges_total),
  };
}

export function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function compareImportVsLocal(
  make: string,
  model: string,
  year: number,
  importListings: CarListing[],
  localListings: CarListing[],
  usd_kes: number = 129.50
) {
  const normMake = make.trim().toLowerCase();
  const normModel = model.trim().toLowerCase();

  const matchingImport = importListings.filter(
    (c) =>
      c.make.toLowerCase().includes(normMake) &&
      c.model.toLowerCase().includes(normModel) &&
      c.price_usd &&
      c.year >= 2018
  );

  const exactImport = matchingImport.filter((c) => c.year === year);
  const usedImport = exactImport.length > 0
    ? exactImport
    : matchingImport.sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));

  const matchingLocal = localListings.filter(
    (c) =>
      c.make.toLowerCase().includes(normMake) &&
      c.model.toLowerCase().includes(normModel) &&
      c.price_kes
  );

  const exactLocal = matchingLocal.filter((c) => c.year === year);
  const usedLocal = exactLocal.length > 0
    ? exactLocal
    : matchingLocal.sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));

  let importData = {
    count: 0,
    min_kes: null as number | null,
    max_kes: null as number | null,
    median_kes: null as number | null,
    best_listing_id: null as number | null,
    best_purchase_usd: null as number | null,
  };

  const importPrices: number[] = [];
  if (usedImport.length > 0) {
    usedImport.slice(0, 20).forEach((item) => {
      const cost = calculateImportCost(item.price_usd!, item.body_type, null, usd_kes);
      importPrices.push(cost.total_import_kes);
    });

    const sortedByPrice = [...usedImport].sort((a, b) => (a.price_usd || 0) - (b.price_usd || 0));
    importData = {
      count: usedImport.length,
      min_kes: Math.round(Math.min(...importPrices)),
      max_kes: Math.round(Math.max(...importPrices)),
      median_kes: Math.round(median(importPrices)),
      best_listing_id: sortedByPrice[0].id,
      best_purchase_usd: sortedByPrice[0].price_usd || null,
    };
  }

  let localData = {
    count: 0,
    min_kes: null as number | null,
    max_kes: null as number | null,
    median_kes: null as number | null,
  };

  if (usedLocal.length > 0) {
    const localPrices = usedLocal.slice(0, 20).map((l) => l.price_kes!);
    localData = {
      count: usedLocal.length,
      min_kes: Math.round(Math.min(...localPrices)),
      max_kes: Math.round(Math.max(...localPrices)),
      median_kes: Math.round(median(localPrices)),
    };
  }

  const result: any = {
    make,
    model,
    year,
    import: importData,
    local: localData,
  };

  if (usedImport.length > 0 && usedLocal.length > 0 && importData.median_kes && localData.median_kes) {
    const saving = Math.round(localData.median_kes - importData.median_kes);
    const pct = Math.round((Math.abs(saving) / localData.median_kes) * 1000) / 10;

    result.saving_kes = saving;
    result.saving_pct = pct;
    result.verdict = saving > 0 ? 'import' : 'local';
    result.verdict_summary =
      saving > 0
        ? `Importing saves ~KES ${saving.toLocaleString()} (${pct}% cheaper than local)`
        : `Local market is ~KES ${Math.abs(saving).toLocaleString()} cheaper`;
  } else {
    result.saving_kes = null;
    result.saving_pct = null;
    result.verdict = !usedLocal.length ? 'no_local_data' : 'no_import_data';
    result.verdict_summary = !usedLocal.length
      ? 'No local market data for this spec'
      : 'No Japan import listings for this spec';
  }

  return result;
}
