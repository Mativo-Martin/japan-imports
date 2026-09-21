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
