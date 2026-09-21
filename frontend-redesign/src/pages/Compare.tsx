import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { useVehicleDropdowns } from '../hooks/useVehicleDropdowns';
import { ComparisonResult, SavingsSummaryItem } from '../types';
import { formatKES, formatUSD, formatKm, formatCC, getSourceBadgeInfo, parseListingImages } from '../utils/formatters';
import { GitCompare, TrendingDown, Sparkles, Trash2 } from 'lucide-react';

export const Compare: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { comparisonCars, removeFromCompare, clearCompare, usdKesRate, openDutyModal } = useApp();
  
  const { makesList, modelsList, selectedMake, setSelectedMake, selectedModel, setSelectedModel } = useVehicleDropdowns(
    searchParams.get('make') || '',
    searchParams.get('model') || ''
  );

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(Math.min(2021, currentYear));

  const [benchmarkResult, setBenchmarkResult] = useState<ComparisonResult | null>(null);
  const [savingsSummary, setSavingsSummary] = useState<SavingsSummaryItem[]>([]);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  useEffect(() => {
    apiClient.getSavingsSummary().then(setSavingsSummary).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchBenchmark = async () => {
      if (!selectedMake || !selectedModel) return;
      setLoadingBenchmark(true);
      try {
        const res = await apiClient.compareVehicles(selectedMake, selectedModel, selectedYear);
        setBenchmarkResult(res);
      } catch (err) {
        console.error('Failed to compare vehicles:', err);
      } finally {
        setLoadingBenchmark(false);
      }
    };
    fetchBenchmark();
  }, [selectedMake, selectedModel, selectedYear]);

  // Rest of JSX...

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Top Banner */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300 text-stone-800 text-xs font-semibold mb-2">
          <GitCompare className="w-3.5 h-3.5 text-[#0E402D]" />
          <span>Market Intelligence & Comparative Pricing</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-display">
          Direct Import vs Local Dealer Comparison
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Benchmark total import landed costs against active Kenyan showroom prices.
        </p>
      </div>

      {/* Part 1: Side-by-Side Comparison of Selected Vehicles from Dock */}
      {comparisonCars.length > 0 && (
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 font-display">
                <Sparkles className="w-5 h-5 text-[#0E402D]" />
                Selected Vehicles Side-by-Side Matrix ({comparisonCars.length})
              </h2>
              <p className="text-xs text-stone-500">Comparing technical specs, FOB/CIF value, and landed Nairobi costs</p>
            </div>
            <button
              onClick={clearCompare}
              className="text-xs text-[#0E402D] hover:text-[#295135] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[650px]">
              {comparisonCars.map((car) => {
                const badge = getSourceBadgeInfo(car.source);
                const isImport = car.source !== 'peachcars';
                const priceUsd = car.price_usd || (car.price_kes ? car.price_kes / usdKesRate : 0);
                const estLanded = isImport
                  ? Math.round((priceUsd + 1600) * usdKesRate * 1.78 + 95000)
                  : car.price_kes || 0;
                const images = parseListingImages(car.images);

                return (
                  <div
                    key={car.id}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between space-y-4 relative group"
                  >
                    <button
                      onClick={() => removeFromCompare(car.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white text-stone-400 hover:text-[#0E402D] border border-stone-200 shadow-2xs z-10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-3">
                      <div className="aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                        <img
                          src={images[0]}
                          alt={car.model}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg}`}>
                          {badge.shortLabel}
                        </span>
                        <h3 className="text-sm font-bold text-stone-900 mt-1 line-clamp-1 font-display">
                          {car.year} {car.make} {car.model}
                        </h3>
                      </div>

                      <div className="space-y-1.5 text-xs text-stone-700">
                        <div className="flex justify-between py-1 border-b border-stone-200">
                          <span className="text-stone-500">CIF / Price (USD)</span>
                          <span className="font-bold font-mono-num text-stone-800">{formatUSD(car.price_usd)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200">
                          <span className="text-stone-700 font-medium">Landed (KES)</span>
                          <span className="font-extrabold font-mono-num text-stone-900">{formatKES(estLanded)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200">
                          <span className="text-stone-500">Mileage</span>
                          <span className="font-mono-num">{formatKm(car.mileage_km)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200">
                          <span className="text-stone-500">Displacement</span>
                          <span className="font-mono-num">{formatCC(car.engine_cc)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200">
                          <span className="text-stone-500">Drivetrain</span>
                          <span>{car.drive_type || '2WD'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-stone-500">Auction Grade</span>
                          <span className="text-[#0E402D] font-bold">{car.auction_grade || '4.0'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200">
                      <button
                        onClick={() => openDutyModal(car)}
                        className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                      >
                        KRA Duty Slip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Part 2: Interactive Model Benchmark Explorer */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900 font-display">Live Model Benchmark Calculator</h2>
            <p className="text-xs text-stone-500">Select any make, model, and year to see market savings metrics</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              aria-label="Select make to benchmark"
              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
            >
              {makesList.map((m) => (
                <option key={m.make} value={m.make}>
                  {m.make}
                </option>
              ))}
            </select>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Select model to benchmark"
              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
            >
              {modelsList.length > 0 ? (
                modelsList.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))
              ) : (
                <option value="">No models available</option>
              )}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Select year of registration"
              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Benchmark Results Display */}
        {loadingBenchmark ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-500 space-y-2">
            <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Querying Japan exporter prices & local dealership records...</p>
          </div>
        ) : benchmarkResult ? (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-stone-900 text-white shadow-md grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="space-y-1">
                <span className="text-xs uppercase font-semibold text-stone-400">
                  Japan Direct Import (Landed KES)
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-white">
                  {formatKES(benchmarkResult.import?.median_kes ?? (benchmarkResult as any).import_landed?.median_kes ?? 0)}
                </div>
                <p className="text-xs text-stone-400">
                  FOB {formatUSD(benchmarkResult.import?.best_purchase_usd ?? (benchmarkResult as any).japan_cif?.median_usd ?? 0)} + KRA Duty & Port
                </p>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-800 pt-4 md:pt-0 md:pl-6">
                <span className="text-xs uppercase font-semibold text-stone-400">
                  Kenyan Showroom Median
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-stone-300">
                  {formatKES(benchmarkResult.local?.median_kes ?? 0)}
                </div>
                <p className="text-xs text-stone-400">
                  Based on verified dealer inventory
                </p>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-800 pt-4 md:pt-0 md:pl-6 bg-stone-800/80 -m-3 p-4 rounded-xl border border-stone-700">
                <span className="text-xs uppercase font-bold text-[#9FCC2E] flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Net Import Buyer Savings
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono-num text-white">
                  +{formatKES(benchmarkResult.saving_kes || 0)}
                </div>
                <p className="text-xs text-stone-300 font-semibold">
                  Save {benchmarkResult.saving_pct || 0}% on average
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Part 3: Top Savings Ranking Table */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-display">Top High-Yield Import Vehicles</h3>
            <p className="text-xs text-stone-500">Vehicles with the largest price spread between Japan auctions and Kenyan dealerships</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Make & Model</th>
                <th className="py-3 px-3">Japan Landed Median</th>
                <th className="py-3 px-3">Kenyan Dealer Median</th>
                <th className="py-3 px-3">Net Cash Saved</th>
                <th className="py-3 px-3">Margin (%)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {savingsSummary.map((item, idx) => (
                <tr key={`${item.make}-${item.model}-${idx}`} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-stone-900 font-display">
                    {item.make} {item.model}
                  </td>
                  <td className="py-3.5 px-3 font-mono-num text-stone-700">
                    {formatKES(item.total_landed_kes ?? item.import_median_kes ?? 0)}
                  </td>
                  <td className="py-3.5 px-3 font-mono-num text-stone-400 line-through">
                    {formatKES(item.median_local_kes ?? item.local_median_kes ?? 0)}
                  </td>
                  <td className="py-3.5 px-3 font-mono-num font-bold text-stone-900">
                    +{formatKES(item.saving_kes)}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#0E402D]/10 text-[#0E402D] border border-[#0E402D]/20 font-bold font-mono-num text-[10px]">
                      {item.saving_pct}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/marketplace?make=${encodeURIComponent(item.make)}&model=${encodeURIComponent(item.model)}`}
                      className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-[11px] transition-colors border border-stone-200"
                    >
                      View Stock
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Compare;