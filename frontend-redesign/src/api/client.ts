import axios from 'axios';
import {
  CarListing,
  ImportCostBreakdown,
  ComparisonResult,
  MLPrediction,
  MLPredictionWithImport,
  MarketStats,
  PriceDistribution,
  TopMake,
  SavingsSummaryItem,
  FilterParams,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

export const apiClient = {
  // Health / Rate
  getHealth: async () => {
    const res = await api.get('/api/health');
    return res.data;
  },

  getExchangeRate: async () => {
    const res = await api.get<{ usd_kes: number; timestamp: string }>('/api/calculator/exchange-rate');
    return res.data;
  },

  // Listings
  getListings: async (params?: FilterParams) => {
    const res = await api.get<CarListing[]>('/api/listings/', { params });
    const total = parseInt(res.headers['x-total-count'] || '0', 10);
    const page = parseInt(res.headers['x-page'] || '1', 10);
    const pageSize = parseInt(res.headers['x-page-size'] || '20', 10);
    return { data: res.data, total, page, pageSize };
  },

  getListingById: async (id: number) => {
    const res = await api.get<CarListing>(`/api/listings/${id}`);
    return res.data;
  },

  getMakes: async () => {
    const res = await api.get<{ make: string; count: number }[]>('/api/listings/meta/makes');
    return res.data;
  },

  getModels: async (make?: string) => {
    if (!make) return [];
    const res = await api.get<{ model: string; count: number }[]>('/api/listings/meta/models', {
      params: { make },
    });
    return res.data;
  },

  // Calculator
  calculateImportCost: async (payload: {
    purchase_usd: number;
    body_type?: string;
    shipping_usd?: number | null;
    clearing_agent_kes?: number;
  }) => {
    const res = await api.post<ImportCostBreakdown>('/api/calculator/estimate', payload);
    return res.data;
  },

  compareVehicles: async (make: string, model: string, year: number) => {
    const res = await api.get<ComparisonResult>('/api/calculator/compare', {
      params: { make, model, year },
    });
    return res.data;
  },

  // ML Valuation
  predictPrice: async (payload: {
    make: string;
    model: string;
    year: number;
    mileage_km: number;
    engine_cc: number;
    fuel_type?: string;
    transmission?: string;
    body_type?: string;
    condition_score?: number;
    drive_type?: string;
  }) => {
    const res = await api.post<MLPrediction>('/api/ml/predict', payload);
    return res.data;
  },

  predictWithImport: async (payload: {
    make: string;
    model: string;
    year: number;
    mileage_km: number;
    engine_cc: number;
    fuel_type?: string;
    transmission?: string;
    body_type?: string;
    condition_score?: number;
    drive_type?: string;
  }) => {
    const res = await api.post<MLPredictionWithImport>('/api/ml/predict-with-import', payload);
    return res.data;
  },

  getModelInfo: async () => {
    const res = await api.get('/api/ml/model-info');
    return res.data;
  },

  // Analytics
  getStatsOverview: async () => {
    const res = await api.get<MarketStats>('/api/stats/overview');
    return res.data;
  },

  getPriceDistribution: async () => {
    const res = await api.get<PriceDistribution[]>('/api/stats/price-distribution');
    return res.data;
  },

  getTopMakes: async () => {
    const res = await api.get<TopMake[]>('/api/stats/top-makes');
    return res.data;
  },

  getSavingsSummary: async () => {
    const res = await api.get<SavingsSummaryItem[]>('/api/stats/savings-summary');
    return res.data;
  },
};
