export interface CarListing {
  id: number;
  source: 'beforward' | 'sbt' | 'peachcars';
  source_id?: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  engine_cc: number;
  fuel_type: string;
  transmission: string;
  body_type: string;
  drive_type?: '2WD' | '4WD' | 'AWD';
  color?: string;
  auction_grade?: string;
  condition_score?: number;
  price_usd?: number;
  price_kes?: number;
  url?: string;
  status: string;
  scraped_at: string;
  images: string[];
  features?: string[];
  location?: string;
  is_cleaned?: boolean;
}

export interface ImportCostBreakdown {
  purchase_usd: number;
  shipping_usd: number;
  insurance_usd: number;
  cif_usd: number;
  usd_kes_rate: number;
  cif_kes: number;
  customs_duty_kes: number;
  excise_duty_kes: number;
  vat_kes: number;
  idf_levy_kes: number;
  rdl_levy_kes: number;
  port_cfs_kes: number;
  clearing_agent_kes: number;
  ntsa_inspection_kes: number;
  number_plates_kes: number;
  comprehensive_ins_kes: number;
  total_import_kes: number;
  total_import_usd: number;
  tax_total_kes: number;
  charges_total_kes: number;
}

export interface ComparisonData {
  count: number;
  min_kes: number | null;
  max_kes: number | null;
  median_kes: number | null;
  best_listing_id?: number | null;
  best_purchase_usd?: number | null;
}

export interface ComparisonResult {
  make: string;
  model: string;
  year: number;
  import: ComparisonData;
  local: ComparisonData;
  saving_kes: number | null;
  saving_pct: number | null;
  verdict: 'import' | 'local' | 'no_local_data' | 'no_import_data';
  verdict_summary: string;
}

export interface MLPrediction {
  predicted_price_usd: number;
  confidence_low_usd: number;
  confidence_high_usd: number;
  confidence: 'high' | 'medium' | 'low';
  model_mae_usd: number;
  features_used: Record<string, any>;
}

export interface MLPredictionWithImport {
  prediction: MLPrediction;
  import_cost: ImportCostBreakdown;
  usd_kes_rate: number;
  summary: {
    predicted_japan_usd: number;
    total_landed_kes: number;
    total_landed_usd: number;
  };
}

export interface MarketStats {
  bf_count: number;
  bf_avg_usd: number;
  bf_min_usd: number;
  bf_max_usd: number;
  local_count: number;
  local_avg_kes: number;
  unique_makes: number;
  unique_models: number;
}

export interface PriceDistribution {
  band?: string;
  price_range?: string;
  count: number;
}

export interface TopMake {
  make: string;
  count: number;
  avg_price_usd: number;
  min_price_usd: number;
}

export interface SavingsSummaryItem {
  make: string;
  model: string;
  year?: number;
  import_median_kes?: number;
  total_landed_kes?: number;
  local_median_kes?: number;
  median_local_kes?: number;
  saving_kes: number;
  saving_pct: number;
  verdict: 'import' | 'buy_local' | 'local';
  import_count?: number;
  local_count?: number;
}

export interface FilterParams {
  q?: string;
  source?: string;
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  fuel_type?: string;
  body_type?: string;
  drive_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}
