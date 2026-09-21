import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_LISTINGS } from './server/data';
import { calculateImportCost, compareImportVsLocal, getUsdKesRate, median } from './server/calculator';
import { predictPrice, predictWithImport, getModelMetadata } from './server/ml';
import { CarListing } from './server/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // In-memory dataset
  let listings: CarListing[] = [...INITIAL_LISTINGS];

  // Helper to format listing prices
  const formatListing = (item: CarListing, rate: number) => {
    const copy = { ...item };
    if (copy.price_usd && !copy.price_kes) {
      copy.price_kes = Math.round(copy.price_usd * rate);
    } else if (copy.price_kes && !copy.price_usd) {
      copy.price_usd = Math.round((copy.price_kes / rate) * 100) / 100;
    }
    return copy;
  };

  // ───────────────────────────────────────────
  // HEALTH CHECK
  // ───────────────────────────────────────────
  app.get('/api/health', async (_req: Request, res: Response) => {
    const rate = await getUsdKesRate();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      dataset_size: listings.length,
      usd_kes_rate: rate,
      ml_model: getModelMetadata(),
    });
  });

  // ───────────────────────────────────────────
  // LISTINGS
  // ───────────────────────────────────────────
  app.get('/api/listings/', async (req: Request, res: Response) => {
    const rate = await getUsdKesRate();
    let filtered = [...listings];

    const q = (req.query.q as string || '').toLowerCase().trim();
    const source = req.query.source as string;
    const make = req.query.make as string;
    const model = req.query.model as string;
    const year_min = req.query.year_min ? parseInt(req.query.year_min as string) : undefined;
    const year_max = req.query.year_max ? parseInt(req.query.year_max as string) : undefined;
    const price_min = req.query.price_min ? parseFloat(req.query.price_min as string) : undefined;
    const price_max = req.query.price_max ? parseFloat(req.query.price_max as string) : undefined;
    const fuel_type = req.query.fuel_type as string;
    const body_type = req.query.body_type as string;
    const drive_type = req.query.drive_type as string;
    const status = req.query.status as string;
    const sort_by = (req.query.sort_by as string) || 'id';
    const sort_order = (req.query.sort_order as string) || 'asc';
    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const page_size = Math.max(1, Math.min(100, parseInt((req.query.page_size as string) || '20')));

    if (q) {
      filtered = filtered.filter((l) =>
        l.make.toLowerCase().includes(q) ||
        l.model.toLowerCase().includes(q) ||
        l.year.toString().includes(q) ||
        (l.body_type && l.body_type.toLowerCase().includes(q)) ||
        (l.color && l.color.toLowerCase().includes(q)) ||
        (l.features && l.features.some((f) => f.toLowerCase().includes(q))) ||
        (l.location && l.location.toLowerCase().includes(q))
      );
    }
    if (source) {
      const s = source.toLowerCase();
      filtered = filtered.filter((l) => l.source.toLowerCase() === s);
    }
    if (make) {
      const m = make.toLowerCase();
      filtered = filtered.filter((l) => l.make.toLowerCase().includes(m));
    }
    if (model) {
      const m = model.toLowerCase();
      filtered = filtered.filter((l) => l.model.toLowerCase().includes(m));
    }
    if (drive_type) {
      const d = drive_type.toLowerCase();
      filtered = filtered.filter((l) => l.drive_type && l.drive_type.toLowerCase() === d);
    }
    if (year_min) {
      filtered = filtered.filter((l) => l.year >= year_min);
    }
    if (year_max) {
      filtered = filtered.filter((l) => l.year <= year_max);
    }
    if (price_min !== undefined) {
      filtered = filtered.filter((l) => {
        const usd = l.price_usd ?? (l.price_kes ? l.price_kes / rate : 0);
        return usd >= price_min;
      });
    }
    if (price_max !== undefined) {
      filtered = filtered.filter((l) => {
        const usd = l.price_usd ?? (l.price_kes ? l.price_kes / rate : 0);
        return usd <= price_max;
      });
    }
    if (fuel_type) {
      const f = fuel_type.toLowerCase();
      filtered = filtered.filter((l) => l.fuel_type.toLowerCase().includes(f));
    }
    if (body_type) {
      const b = body_type.toLowerCase();
      filtered = filtered.filter((l) => l.body_type.toLowerCase() === b);
    }
    if (status) {
      const st = status.toLowerCase();
      filtered = filtered.filter((l) => l.status.toLowerCase() === st);
    }

    // Sort
    filtered.sort((a, b) => {
      let vA: any = (a as any)[sort_by];
      let vB: any = (b as any)[sort_by];
      if (sort_by === 'price_usd') {
        vA = a.price_usd ?? (a.price_kes ? a.price_kes / rate : 0);
        vB = b.price_usd ?? (b.price_kes ? b.price_kes / rate : 0);
      } else if (sort_by === 'price_kes') {
        vA = a.price_kes ?? (a.price_usd ? a.price_usd * rate : 0);
        vB = b.price_kes ?? (b.price_usd ? b.price_usd * rate : 0);
      }
      if (vA === undefined) vA = 0;
      if (vB === undefined) vB = 0;
      if (typeof vA === 'string') {
        return sort_order === 'desc' ? vB.localeCompare(vA) : vA.localeCompare(vB);
      }
      return sort_order === 'desc' ? vB - vA : vA - vB;
    });

    const totalCount = filtered.length;
    const startIndex = (page - 1) * page_size;
    const paginated = filtered.slice(startIndex, startIndex + page_size).map((item) => formatListing(item, rate));

    res.setHeader('X-Total-Count', totalCount.toString());
    res.setHeader('X-Page', page.toString());
    res.setHeader('X-Page-Size', page_size.toString());
    res.json(paginated);
  });

  app.get('/api/listings/meta/makes', (_req: Request, res: Response) => {
    const makeCounts: Record<string, number> = {};
    for (const l of listings) {
      makeCounts[l.make] = (makeCounts[l.make] || 0) + 1;
    }
    const result = Object.entries(makeCounts)
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count || a.make.localeCompare(b.make));
    res.json(result);
  });

  app.get('/api/listings/meta/models', (req: Request, res: Response) => {
    const make = req.query.make as string;
    const modelCounts: Record<string, number> = {};
    for (const l of listings) {
      if (!make || l.make.toLowerCase() === make.toLowerCase()) {
        modelCounts[l.model] = (modelCounts[l.model] || 0) + 1;
      }
    }
    const result = Object.entries(modelCounts)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
    res.json(result);
  });

  app.get('/api/listings/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const item = listings.find((l) => l.id === id);
    if (!item) {
      res.status(404).json({ detail: 'Listing not found' });
      return;
    }
    const rate = await getUsdKesRate();
    res.json(formatListing(item, rate));
  });

  app.post('/api/listings/clear-cache', (_req: Request, res: Response) => {
    res.json({ status: 'success', message: 'Listings cache cleared' });
  });

  // ───────────────────────────────────────────
  // CALCULATOR
  // ───────────────────────────────────────────
  app.post('/api/calculator/estimate', async (req: Request, res: Response) => {
    try {
      const { purchase_usd, body_type, shipping_usd, clearing_agent_kes } = req.body;
      if (!purchase_usd || purchase_usd <= 0) {
        res.status(400).json({ detail: 'purchase_usd must be greater than 0' });
        return;
      }
      const rate = await getUsdKesRate();
      const result = calculateImportCost(
        parseFloat(purchase_usd),
        body_type || 'sedan',
        shipping_usd ? parseFloat(shipping_usd) : null,
        rate,
        clearing_agent_kes ? parseFloat(clearing_agent_kes) : 40_000.0
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'Error calculating estimate' });
    }
  });

  app.get('/api/calculator/compare', async (req: Request, res: Response) => {
    const make = (req.query.make as string) || '';
    const model = (req.query.model as string) || '';
    const year = parseInt((req.query.year as string) || '2021');

    if (!make || !model) {
      res.status(400).json({ detail: 'make and model query parameters are required' });
      return;
    }

    const rate = await getUsdKesRate();
    const importCars = listings.filter((l) => l.source !== 'peachcars');
    const localCars = listings.filter((l) => l.source === 'peachcars');

    const result = compareImportVsLocal(make, model, year, importCars, localCars, rate);
    res.json(result);
  });

  app.get('/api/calculator/exchange-rate', async (_req: Request, res: Response) => {
    const rate = await getUsdKesRate();
    res.json({
      usd_kes: rate,
      source: 'live_or_cached',
      timestamp: new Date().toISOString(),
    });
  });

  // ───────────────────────────────────────────
  // MACHINE LEARNING
  // ───────────────────────────────────────────
  app.post('/api/ml/predict', (req: Request, res: Response) => {
    try {
      const result = predictPrice(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'Error predicting car price' });
    }
  });

  app.post('/api/ml/predict-with-import', async (req: Request, res: Response) => {
    try {
      const result = await predictWithImport(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'Error predicting with import' });
    }
  });

  app.post('/api/ml/predict/batch', (req: Request, res: Response) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ detail: 'Request body must be an array' });
        return;
      }
      const predictions = items.slice(0, 50).map((item) => predictPrice(item));
      res.json(predictions);
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'Error running batch prediction' });
    }
  });

  app.get('/api/ml/model-info', (_req: Request, res: Response) => {
    res.json(getModelMetadata());
  });

  // ───────────────────────────────────────────
  // STATS
  // ───────────────────────────────────────────
  app.get('/api/stats/overview', async (_req: Request, res: Response) => {
    const importListings = listings.filter((l) => l.source !== 'peachcars');
    const localListings = listings.filter((l) => l.source === 'peachcars');

    const bfPrices = importListings.map((l) => l.price_usd || 0).filter((p) => p > 0);
    const localPrices = localListings.map((l) => l.price_kes || 0).filter((p) => p > 0);

    const bfAvg = bfPrices.length ? Math.round(bfPrices.reduce((a, b) => a + b, 0) / bfPrices.length) : 0;
    const localAvg = localPrices.length ? Math.round(localPrices.reduce((a, b) => a + b, 0) / localPrices.length) : 0;

    const uniqueMakes = new Set(listings.map((l) => l.make)).size;
    const uniqueModels = new Set(listings.map((l) => `${l.make}:${l.model}`)).size;

    res.json({
      bf_count: importListings.length,
      bf_avg_usd: bfAvg,
      bf_min_usd: bfPrices.length ? Math.min(...bfPrices) : 0,
      bf_max_usd: bfPrices.length ? Math.max(...bfPrices) : 0,
      local_count: localListings.length,
      local_avg_kes: localAvg,
      unique_makes: uniqueMakes,
      unique_models: uniqueModels,
    });
  });

  app.get('/api/stats/price-distribution', (_req: Request, res: Response) => {
    const importListings = listings.filter((l) => l.source !== 'peachcars');
    const bands: Record<string, number> = {
      'Under $3k': 0,
      '$3k–$6k': 0,
      '$6k–$10k': 0,
      '$10k–$15k': 0,
      '$15k–$25k': 0,
      'Over $25k': 0,
    };

    for (const car of importListings) {
      const p = car.price_usd || 0;
      if (p < 3000) bands['Under $3k']++;
      else if (p < 6000) bands['$3k–$6k']++;
      else if (p < 10000) bands['$6k–$10k']++;
      else if (p < 15000) bands['$10k–$15k']++;
      else if (p < 25000) bands['$15k–$25k']++;
      else bands['Over $25k']++;
    }

    const result = Object.entries(bands).map(([range, count]) => ({
      price_range: range,
      count,
    }));
    res.json(result);
  });

  app.get('/api/stats/top-makes', (_req: Request, res: Response) => {
    const importListings = listings.filter((l) => l.source !== 'peachcars');
    const makeMap: Record<string, { count: number; total_usd: number; min_usd: number }> = {};

    for (const car of importListings) {
      const p = car.price_usd || 0;
      if (!makeMap[car.make]) {
        makeMap[car.make] = { count: 0, total_usd: 0, min_usd: p || 999999 };
      }
      makeMap[car.make].count++;
      makeMap[car.make].total_usd += p;
      if (p && p < makeMap[car.make].min_usd) {
        makeMap[car.make].min_usd = p;
      }
    }

    const result = Object.entries(makeMap)
      .map(([make, data]) => ({
        make,
        count: data.count,
        avg_price_usd: Math.round(data.total_usd / data.count),
        min_price_usd: data.min_usd === 999999 ? 0 : data.min_usd,
      }))
      .sort((a, b) => b.count - a.count);

    res.json(result);
  });

  app.get('/api/stats/savings-summary', async (_req: Request, res: Response) => {
    const rate = await getUsdKesRate();
    const importListings = listings.filter((l) => l.source !== 'peachcars');
    const localListings = listings.filter((l) => l.source === 'peachcars');

    // Aggregate by make and model
    const pairs = new Set<string>();
    for (const l of listings) {
      pairs.add(`${l.make}|${l.model}`);
    }

    const savingsList: any[] = [];
    for (const pair of pairs) {
      const [make, model] = pair.split('|');
      const comp = compareImportVsLocal(make, model, 2021, importListings, localListings, rate);
      if (comp.import.count > 0 && comp.local.count > 0 && comp.saving_kes !== null) {
        savingsList.push({
          make,
          model,
          import_median_kes: comp.import.median_kes,
          local_median_kes: comp.local.median_kes,
          saving_kes: comp.saving_kes,
          saving_pct: comp.saving_pct,
          verdict: comp.saving_kes > 0 ? 'import' : 'buy_local',
          import_count: comp.import.count,
          local_count: comp.local.count,
        });
      }
    }

    savingsList.sort((a, b) => b.saving_kes - a.saving_kes);
    res.json(savingsList);
  });

  app.post('/api/stats/clear-cache', (_req: Request, res: Response) => {
    res.json({ status: 'success', message: 'Stats cache cleared' });
  });

  // ───────────────────────────────────────────
  // VITE MIDDLEWARE (DEV) / STATIC SERVE (PROD)
  // ───────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
