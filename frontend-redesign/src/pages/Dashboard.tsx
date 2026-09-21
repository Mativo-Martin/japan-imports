import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import {
  CarListing,
  MarketStats,
  PriceDistribution,
  TopMake,
  SavingsSummaryItem,
  ImportCostBreakdown,
} from '../types';
import { CarCard } from '../components/CarCard';
import { formatKES, formatUSD, formatNumber } from '../utils/formatters';
import {
  TrendingUp,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Sparkles,
  DollarSign,
  Layers,
  BarChart3,
  Flame,
  Anchor,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { usdKesRate } = useApp();
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [priceDist, setPriceDist] = useState<PriceDistribution[]>([]);
  const [topMakes, setTopMakes] = useState<TopMake[]>([]);
  const [savingsList, setSavingsList] = useState<SavingsSummaryItem[]>([]);
  const [recentListings, setRecentListings] = useState<CarListing[]>([]);
  const [, setLoading] = useState(true);

  // Quick estimator widget state
  const [quickUsd, setQuickUsd] = useState<number>(5000);
  const [quickBody, setQuickBody] = useState<string>('sedan');
  const [quickResult, setQuickResult] = useState<ImportCostBreakdown | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [statsData, distData, makesData, savingsData, listingsData] = await Promise.all([
          apiClient.getStatsOverview(),
          apiClient.getPriceDistribution(),
          apiClient.getTopMakes(),
          apiClient.getSavingsSummary(),
          apiClient.getListings({ page: 1, page_size: 6, sort_by: 'year', sort_order: 'desc' }),
        ]);

        setStats(statsData);
        setPriceDist(distData);
        setTopMakes(makesData);
        setSavingsList(savingsData);
        setRecentListings(listingsData.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Recalculate quick estimator
  useEffect(() => {
    const calc = async () => {
      if (!quickUsd || quickUsd <= 0) return;
      try {
        const res = await apiClient.calculateImportCost({
          purchase_usd: quickUsd,
          body_type: quickBody,
        });
        setQuickResult(res);
      } catch (err) {
        console.error(err);
      }
    };

    const timer = setTimeout(calc, 250);
    return () => clearTimeout(timer);
  }, [quickUsd, quickBody]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Hero Section - Japanese Minimalist Luxury */}
      <div className="relative rounded-3xl bg-stone-900 text-stone-100 p-8 sm:p-12 overflow-hidden shadow-xl border border-stone-800">
        {/* Subtle geometric pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Soft green accent aura */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#0E402D]/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#9FCC2E]"></span>
              <span>Japan Direct Import Concierge for Kenya 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.12] font-display">
              Precision Import Intelligence.{' '}
              <span className="text-[#9FCC2E]">
                Save KES 800,000+
              </span>{' '}
              on Direct Japan Sourcing.
            </h1>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Live verified inventory across <strong>BeForward and SBT Japan</strong> cross-benchmarked against Nairobi showroom stock with exact <strong>KRA 2024 tax formulas</strong> and port clearing logistics.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/marketplace"
                className="px-6 py-3 rounded-xl bg-white text-stone-900 font-semibold text-sm transition-all hover:bg-stone-100 flex items-center gap-2 shadow-xs"
              >
                <Search className="w-4 h-4 text-stone-800" />
                <span>Browse Japan Inventory</span>
              </Link>

              <Link
                to="/calculator"
                className="px-6 py-3 rounded-xl bg-stone-800/90 hover:bg-stone-800 text-stone-200 font-medium text-sm transition-all border border-stone-700 flex items-center gap-2"
              >
                <Calculator className="w-4 h-4 text-stone-400" />
                <span>KRA Duty Calculator</span>
              </Link>
            </div>
          </div>

          {/* Quick Estimator Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-stone-950/90 border border-stone-800 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#9FCC2E]" />
                  <span className="text-sm font-semibold text-stone-100">Quick Landed Cost Preview</span>
                </div>
                <span className="text-[11px] text-stone-400 font-mono-num">
                  1 USD = {usdKesRate.toFixed(2)} KES
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-stone-300 font-medium block mb-1.5 flex justify-between">
                    <span>Japan CIF Price (USD)</span>
                    <span className="font-bold text-white font-mono-num">${quickUsd.toLocaleString()}</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="100000"
                    step="500"
                    value={quickUsd}
                    onChange={(e) => setQuickUsd(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-stone-500 font-mono-num"
                  />
                </div>

                <div>
                  <label className="text-stone-300 font-medium block mb-1.5">Vehicle Category</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['sedan', 'suv', 'hatchback'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setQuickBody(type)}
                        className={`py-1.5 px-2 rounded-lg capitalize font-medium transition-all text-xs ${
                          quickBody === type
                            ? 'bg-stone-800 text-white border border-stone-600'
                            : 'bg-stone-900/60 text-stone-400 border border-stone-800 hover:text-stone-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {quickResult && (
                  <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
                    <div className="flex justify-between text-stone-300">
                      <span>Total KRA Taxes:</span>
                      <span className="font-mono-num text-stone-200 font-semibold">
                        {formatKES(quickResult.tax_total_kes)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-300">
                      <span>Port CFS & Clearing Fees:</span>
                      <span className="font-mono-num text-stone-200">
                        {formatKES(quickResult.charges_total_kes)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Total Landed in Nairobi
                        </span>
                        <span className="text-lg font-bold font-mono-num text-[#9FCC2E]">
                          {formatKES(quickResult.total_import_kes)}
                        </span>
                      </div>
                      <Link
                        to={`/calculator?usd=${quickUsd}&body=${quickBody}`}
                        className="px-3 py-1.5 rounded-lg bg-white text-stone-900 font-semibold text-[11px] hover:bg-stone-200 transition-all flex items-center gap-1"
                      >
                        <span>Full Slip</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Verified Japan Stock</span>
              <div className="p-1.5 rounded-md bg-stone-100 text-stone-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono-num text-stone-900">
              {formatNumber(stats.bf_count)}
            </div>
            <p className="text-[11px] text-stone-500">Listed across Japan exporters</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Japan Avg CIF Price</span>
              <div className="p-1.5 rounded-md bg-stone-100 text-stone-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono-num text-stone-900">
              {formatUSD(stats.bf_avg_usd)}
            </div>
            <p className="text-[11px] text-stone-500">≈ {formatKES(stats.bf_avg_usd * usdKesRate)}</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Kenyan Showroom Avg</span>
              <div className="p-1.5 rounded-md bg-stone-100 text-stone-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono-num text-stone-900">
              {formatKES(stats.local_avg_kes)}
            </div>
            <p className="text-[11px] text-stone-500">Verified local dealer prices</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
              <span>Transit Turnaround</span>
              <div className="p-1.5 rounded-md bg-[#0E402D]/10 text-[#0E402D]">
                <Anchor className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono-num text-[#0E402D]">
              26–28 Days
            </div>
            <p className="text-[11px] text-stone-500">RoRo Yokohama to Mombasa</p>
          </div>
        </div>
      )}

      {/* Savings Spotlight / Top Deals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#0E402D]" />
              <h2 className="text-xl font-bold text-stone-900 font-display">Direct Import Savings Benchmark</h2>
            </div>
            <p className="text-xs text-stone-500">
              Direct comparison: Importing from Japan vs buying from Nairobi car dealerships
            </p>
          </div>

          <Link
            to="/compare"
            className="text-xs font-semibold text-[#0E402D] hover:text-[#295135] flex items-center gap-1 transition-colors"
          >
            <span>Full Comparison Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savingsList.slice(0, 3).map((item, idx) => (
            <div
              key={`${item.make}-${item.model}-${idx}`}
              className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:border-stone-300 hover:shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      {item.make}
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-[#0E402D] transition-colors font-display">
                      {item.model}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#0E402D]/10 text-[#0E402D] border border-[#0E402D]/20 text-xs font-bold font-mono-num">
                    Save {item.saving_pct}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-stone-100">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Import Landed Median</span>
                    <span className="font-bold text-stone-900 font-mono-num">
                      {formatKES(item.total_landed_kes ?? item.import_median_kes ?? 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-400 block text-[10px]">Kenyan Dealer Median</span>
                    <span className="font-medium text-stone-400 font-mono-num line-through">
                      {formatKES(item.median_local_kes ?? item.local_median_kes ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Net Cash Savings</span>
                  <span className="text-base font-extrabold font-mono-num text-[#0E402D]">
                    +{formatKES(item.saving_kes)}
                  </span>
                </div>

                <Link
                  to={`/marketplace?make=${encodeURIComponent(item.make)}&model=${encodeURIComponent(item.model)}`}
                  className="p-2 rounded-lg bg-stone-100 group-hover:bg-stone-900 group-hover:text-white text-stone-700 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Price Distribution Histogram */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-stone-700" />
              <h3 className="text-base font-bold text-stone-900 font-display">Japan Stock CIF Price Tiers (USD)</h3>
            </div>
            <span className="text-xs text-stone-500">Distribution Volume</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ea" />
                <XAxis dataKey={priceDist[0]?.band ? "band" : "price_range"} stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '0.5rem',
                    color: '#fafaf9',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: 'rgba(231, 229, 228, 0.4)' }}
                />
                <Bar dataKey="count" fill="#292524" radius={[4, 4, 0, 0]}>
                  {priceDist.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 1 || index === 2 ? '#0E402D' : '#57534e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Makes Breakdown */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-stone-700" />
                <h3 className="text-base font-bold text-stone-900 font-display">Most Sourced Japanese Brands</h3>
              </div>
              <span className="text-xs text-stone-500">By Available Stock</span>
            </div>

            <div className="mt-4 space-y-2.5">
              {topMakes.slice(0, 5).map((make) => (
                <Link
                  key={make.make}
                  to={`/marketplace?make=${encodeURIComponent(make.make)}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 hover:bg-stone-100 hover:border-stone-300 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-800 text-xs group-hover:text-[#0E402D]">
                      {make.make.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-900 text-sm group-hover:text-[#0E402D] transition-colors">
                        {make.make}
                      </span>
                      <span className="text-xs text-stone-500 block">
                        Avg: {formatUSD(make.avg_price_usd)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-stone-900 block font-mono-num">
                      {make.count} units
                    </span>
                    <span className="text-[10px] text-stone-500">
                      From {formatUSD(make.min_price_usd)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Link
            to="/marketplace"
            className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 transition-colors text-center block mt-4 border border-stone-200"
          >
            View All Brands & Catalog
          </Link>
        </div>
      </div>

      {/* Verified Inventory Preview */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-display">Featured Japanese Vehicles</h2>
            <p className="text-xs text-stone-500">
              Verified Japan stock with instant landed cost estimates and direct showroom comparisons
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/marketplace"
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
            >
              <span>View Full Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentListings.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </div>
    </div>
  );
};
