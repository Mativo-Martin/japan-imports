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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hero Section - Executive Corporate Sourcing */}
      <div className="relative rounded-3xl bg-black text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-[#295135]">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#295135]/80 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#295135] border border-[#6BD425]/30 text-stone-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#6BD425] animate-pulse"></span>
              <span>Direct Japan Sourcing & KRA 2026 Intelligence</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-display">
              Verified Japan Inventory.{' '}
              <span className="text-[#6BD425]">
                Save KES 600,000+
              </span>{' '}
              on Direct Imports.
            </h1>

            <p className="text-stone-200 text-xs sm:text-sm leading-relaxed max-w-xl">
              Cross-benchmark live stock from <strong>BE FORWARD & SBT Japan</strong> against Kenya local dealer stock with exact <strong>KRA statutory duties</strong>, clearing tariffs, and port logistics.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/marketplace"
                className="px-5 py-2.5 rounded-xl bg-[#6BD425] text-[#000000] font-bold text-xs sm:text-sm transition-all hover:bg-[#5bc01e] flex items-center gap-2 shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Search Vehicles</span>
              </Link>

              <Link
                to="/calculator"
                className="px-5 py-2.5 rounded-xl bg-[#295135] hover:bg-[#1e3c27] text-white font-semibold text-xs sm:text-sm transition-all border border-white/15 flex items-center gap-2"
              >
                <Calculator className="w-4 h-4 text-[#6BD425]" />
                <span>Duty Simulator</span>
              </Link>
            </div>
          </div>

          {/* Quick Estimator Card */}
          <div className="lg:col-span-5">
            <div className="p-5 rounded-2xl bg-[#000000]/60 border border-[#295135] shadow-2xl backdrop-blur-md space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#295135] pb-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#6BD425]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-display">
                    Quick Landed Cost Simulator
                  </span>
                </div>
                <span className="text-[11px] text-[#6BD425] font-mono-num font-bold">
                  1 USD = {usdKesRate.toFixed(2)} KES
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-stone-300 font-medium block mb-1 flex justify-between">
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
                    className="w-full bg-[#0E402D]/40 border border-[#295135] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6BD425] font-mono-num font-semibold"
                  />
                </div>

                <div>
                  <label className="text-stone-300 font-medium block mb-1">Body Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['sedan', 'suv', 'hatchback'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setQuickBody(type)}
                        className={`py-1.5 px-2 rounded-lg capitalize font-bold transition-all text-[11px] ${quickBody === type
                            ? 'bg-[#6BD425] text-[#000000]'
                            : 'bg-[#295135]/60 text-stone-300 hover:text-white border border-[#295135]'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {quickResult && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#295135] space-y-1.5">
                    <div className="flex justify-between text-stone-300 text-[11px]">
                      <span>KRA Duty & Taxes:</span>
                      <span className="font-mono-num text-white font-semibold">
                        {formatKES(quickResult.tax_total_kes)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#295135]/80 border border-[#6BD425]/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-300 block">
                          Total Landed Nairobi
                        </span>
                        <span className="text-base font-extrabold font-mono-num text-[#6BD425]">
                          {formatKES(quickResult.total_import_kes)}
                        </span>
                      </div>
                      <Link
                        to={`/calculator?usd=${quickUsd}&body=${quickBody}`}
                        className="px-3 py-1.5 rounded-lg bg-white text-[#000000] font-bold text-[11px] hover:bg-stone-200 transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <span>Details</span>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[#295135] text-xs font-bold uppercase tracking-wider">
              <span>Japan Inventory</span>
              <div className="p-1.5 rounded-lg bg-[#0E402D]/8 text-[#0E402D]">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono-num text-[#000000]">
              {formatNumber(stats.bf_count)}
            </div>
            <p className="text-[11px] text-black font-medium">Verified exporter stock</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[#295135] text-xs font-bold uppercase tracking-wider">
              <span>Avg Japan CIF</span>
              <div className="p-1.5 rounded-lg bg-[#0E402D]/8 text-[#0E402D]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono-num text-[#000000]">
              {formatUSD(stats.bf_avg_usd)}
            </div>
            <p className="text-[11px] text-black font-medium">≈ {formatKES(stats.bf_avg_usd * usdKesRate)}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[#295135] text-xs font-bold uppercase tracking-wider">
              <span>Kenya Dealer Avg</span>
              <div className="p-1.5 rounded-lg bg-[#0E402D]/8 text-[#0E402D]">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono-num text-[#000000]">
              {formatKES(stats.local_avg_kes)}
            </div>
            <p className="text-[11px] text-black font-medium">Verified local stock</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[#295135] text-xs font-bold uppercase tracking-wider">
              <span>Shipping Transit</span>
              <div className="p-1.5 rounded-lg bg-[#0E402D]/8 text-[#0E402D]">
                <Anchor className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono-num text-[#0E402D]">
              26–28 Days
            </div>
            <p className="text-[11px] text-black font-medium">Yokohama to Mombasa</p>
          </div>
        </div>
      )}

      {/* Savings Spotlight / Top Deals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#0E402D]" />
              <h2 className="text-lg font-bold text-[#000000] font-display">Direct Import Benchmark Savings</h2>
            </div>
            <p className="text-xs text-black">
              Live comparison: Japan landed cost vs local Kenyan dealership showroom prices
            </p>
          </div>

          <Link
            to="/compare"
            className="text-xs font-bold text-[#0E402D] hover:text-[#295135] flex items-center gap-1 transition-colors"
          >
            <span>Compare Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savingsList.slice(0, 3).map((item, idx) => (
            <div
              key={`${item.make}-${item.model}-${idx}`}
              className="p-4 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs hover:border-[#0E402D]/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#295135] uppercase tracking-wider">
                      {item.make}
                    </span>
                    <h3 className="text-base font-bold text-[#000000] font-display">
                      {item.model}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#0E402D] text-[#6BD425] text-[11px] font-bold font-mono-num">
                    Save {item.saving_pct}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-stone-100">
                  <div>
                    <span className="text-black block text-[10px]">Import Landed</span>
                    <span className="font-bold text-[#000000] font-mono-num">
                      {formatKES(item.total_landed_kes ?? item.import_median_kes ?? 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-black block text-[10px]">Dealer Median</span>
                    <span className="font-medium text-black font-mono-num line-through">
                      {formatKES(item.median_local_kes ?? item.local_median_kes ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-1 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-black uppercase font-semibold block">Net Cash Difference</span>
                  <span className="text-base font-black font-mono-num text-[#0E402D]">
                    +{formatKES(item.saving_kes)}
                  </span>
                </div>

                <Link
                  to={`/marketplace?make=${encodeURIComponent(item.make)}&model=${encodeURIComponent(item.model)}`}
                  className="p-1.5 rounded-lg bg-[#F6F7EB] hover:bg-[#0E402D] hover:text-[#6BD425] text-stone-700 transition-colors border border-[#0E402D]/10"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Analytics Charts */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0E402D]" />
              <h3 className="text-sm font-bold text-[#000000] font-display">Japan CIF Price Bands (USD)</h3>
            </div>
            <span className="text-[11px] text-black font-medium">Verified Units</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F6F7EB" />
                <XAxis dataKey={priceDist[0]?.band ? "band" : "price_range"} stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E402D',
                    borderColor: '#295135',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '11px',
                  }}
                  cursor={{ fill: 'rgba(14, 64, 45, 0.05)' }}
                />
                <Bar dataKey="count" fill="#0E402D" radius={[4, 4, 0, 0]}>
                  {priceDist.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 1 || index === 2 ? '#0E402D' : '#295135'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-[#0E402D]/10 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0E402D]" />
                <h3 className="text-sm font-bold text-[#000000] font-display">Top Japanese Brands</h3>
              </div>
              <span className="text-[11px] text-black font-medium">Stock Volume</span>
            </div>

            <div className="mt-3 space-y-2">
              {topMakes.slice(0, 4).map((make) => (
                <Link
                  key={make.make}
                  to={`/marketplace?make=${encodeURIComponent(make.make)}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#F6F7EB] border border-[#0E402D]/8 hover:border-[#0E402D]/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#0E402D]/10 flex items-center justify-center font-bold text-[#0E402D] text-xs">
                      {make.make.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-[#000000] text-xs group-hover:text-[#0E402D] transition-colors">
                        {make.make}
                      </span>
                      <span className="text-[10px] text-black block">
                        Avg: {formatUSD(make.avg_price_usd)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#000000] block font-mono-num">
                      {make.count} cars
                    </span>
                    <span className="text-[10px] text-[#295135] font-semibold">
                      From {formatUSD(make.min_price_usd)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Link
            to="/marketplace"
            className="w-full py-2 rounded-xl bg-[#0E402D] hover:bg-[#295135] text-xs font-bold text-white transition-colors text-center block mt-3"
          >
            Explore Full Marketplace
          </Link>
        </div>
      </div> */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* PRICE DISTRIBUTION */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-black/10 shadow-2xs overflow-hidden">
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF1EC] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-[#0E402D]" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-black font-display">
                    Japan CIF Price Bands
                  </h3>
                  <p className="text-[10px] text-black mt-0.5">
                    Distribution across verified import tiers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-black">
                  Verified Units
                </span>

                <div className="px-2.5 py-1 rounded-full bg-[#F6F7EB] border border-black/[0.07]">
                  <span className="text-[10px] font-bold text-[#0E402D]">
                    {priceDist.reduce((sum, item) => sum + item.count, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[310px] px-3 pt-3 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priceDist}
                margin={{
                  top: 25,
                  right: 15,
                  left: -15,
                  bottom: 5,
                }}
                barCategoryGap="14%"
              >
                <defs>
                  <linearGradient
                    id="priceGreen"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#9BCB20" />
                    <stop offset="100%" stopColor="#79A815" />
                  </linearGradient>

                  <linearGradient
                    id="priceDarkGreen"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#15563D" />
                    <stop offset="100%" stopColor="#0E402D" />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="#E9ECE7"
                  strokeDasharray="2 4"
                />

                <XAxis
                  dataKey={priceDist[0]?.band ? "band" : "price_range"}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#78716C",
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                  dy={9}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#A8A29E",
                    fontSize: 10,
                  }}
                  width={30}
                />

                <Tooltip
                  cursor={{
                    fill: "rgba(14, 64, 45, 0.035)",
                  }}
                  contentStyle={{
                    background: "#111111",
                    border: "none",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    boxShadow: "0 8px 25px rgba(0,0,0,.16)",
                    fontSize: "11px",
                  }}
                  labelStyle={{
                    color: "#A8B9AE",
                    fontSize: "10px",
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                  itemStyle={{
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="count"
                  radius={[7, 7, 2, 2]}
                  maxBarSize={58}
                  label={{
                    position: "top",
                    fill: "#57534E",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {priceDist.map((item, index) => {
                    const maxCount = Math.max(
                      ...priceDist.map((item) => item.count)
                    );

                    const isHighest = item.count === maxCount;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          isHighest
                            ? "url(#priceDarkGreen)"
                            : "url(#priceGreen)"
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="px-5 py-3 border-t border-black/[0.06] bg-[#FCFCFA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0E402D]" />
              <span className="text-[10px] font-medium text-black">
                Highest inventory band
              </span>
            </div>

            <span className="text-[10px] font-medium text-black">
              Japan → Kenya · CIF USD
            </span>
          </div>
        </div>

        {/* TOP BRANDS */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-black/10 shadow-2xs overflow-hidden">
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF1EC] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#0E402D]" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-black font-display">
                    Top Japanese Brands
                  </h3>

                  <p className="text-[10px] text-black mt-0.5">
                    Ranked by available stock
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-black">
                Stock Volume
              </span>
            </div>
          </div>

          <div className="px-5 pt-3">
            {topMakes.slice(0, 4).map((make, index) => {
              const maxCount = topMakes[0]?.count || 1;
              const percentage = (make.count / maxCount) * 100;

              return (
                <Link
                  key={make.make}
                  to={`/marketplace?make=${encodeURIComponent(make.make)}`}
                  className="group relative block py-3.5 border-b border-black/[0.07] last:border-0"
                >
                  {/* Volume indicator */}
                  <div
                    className="absolute left-0 bottom-0 h-[2px] bg-[#9BCB20] transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="flex items-center justify-between">
                    {/* Left */}
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-[10px] font-bold text-stone-300 font-mono-num">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="w-9 h-9 rounded-xl bg-[#F7F7F4] border border-black/[0.07] flex items-center justify-center">
                        <span className="text-[10px] font-black text-black">
                          {make.make.substring(0, 2).toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-black group-hover:text-[#0E402D] transition-colors">
                          {make.make}
                        </span>

                        <span className="block text-[10px] text-black mt-0.5">
                          Avg. {formatUSD(make.avg_price_usd)}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="text-right">
                      <span className="block text-xs font-bold text-black font-mono-num">
                        {make.count} cars
                      </span>

                      <span className="block text-[10px] text-[#0E402D] font-semibold mt-0.5">
                        From {formatUSD(make.min_price_usd)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="p-5 pt-4">
            <Link
              to="/marketplace"
              className="group flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-black hover:bg-[#0E402D] text-white text-[11px] font-bold transition-colors"
            >
              Explore Full Marketplace
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>


      {/* Verified Inventory Preview */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#000000] font-display">Featured Direct Import Stock</h2>
            <p className="text-xs text-black">
              Verified Japan vehicles with calculated landed cost estimates in Nairobi
            </p>
          </div>

          <Link
            to="/marketplace"
            className="px-3.5 py-1.5 rounded-xl bg-[#0E402D] hover:bg-[#295135] text-xs font-bold text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View All Stock</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6BD425]" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentListings.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </div>
    </div>
  );
};
