import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { useVehicleDropdowns } from '../hooks/useVehicleDropdowns';
import { ComparisonResult, SavingsSummaryItem } from '../types';
import {
  formatKES,
  formatUSD,
  formatKm,
  formatCC,
  getSourceBadgeInfo,
  parseListingImages,
  CAR_PLACEHOLDER_SVG,
} from '../utils/formatters';
import {
  GitCompare,
  TrendingDown,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const Compare: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    comparisonCars,
    removeFromCompare,
    clearCompare,
    usdKesRate,
    openDutyModal,
  } = useApp();

  const {
    makesList,
    modelsList,
    selectedMake,
    setSelectedMake,
    selectedModel,
    setSelectedModel,
  } = useVehicleDropdowns(
    searchParams.get('make') || '',
    searchParams.get('model') || ''
  );

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: currentYear - 2018 + 1 },
    (_, i) => currentYear - i
  );

  const [selectedYear, setSelectedYear] = useState<number>(
    Math.min(2021, currentYear)
  );

  const [benchmarkResult, setBenchmarkResult] =
    useState<ComparisonResult | null>(null);
  const [savingsSummary, setSavingsSummary] = useState<
    SavingsSummaryItem[]
  >([]);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  useEffect(() => {
    apiClient
      .getSavingsSummary()
      .then(setSavingsSummary)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchBenchmark = async () => {
      if (!selectedMake || !selectedModel) return;

      setLoadingBenchmark(true);

      try {
        const res = await apiClient.compareVehicles(
          selectedMake,
          selectedModel,
          selectedYear
        );

        setBenchmarkResult(res);
      } catch (err) {
        console.error('Failed to compare vehicles:', err);
      } finally {
        setLoadingBenchmark(false);
      }
    };

    fetchBenchmark();
  }, [selectedMake, selectedModel, selectedYear]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#000000]/10 border border-[#000000]/20 text-[#000000] text-xs font-bold mb-1.5">
          <GitCompare className="w-3.5 h-3.5 text-[#000000]" />
          <span>Market Intelligence & Comparative Pricing</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-black text-[#000000] tracking-tight font-display">
          Direct Japan Import vs Kenya Showroom Benchmark
        </h1>

        <p className="text-xs text-stone-500">
          Compare total landed costs against active Kenyan dealership
          inventory prices
        </p>
      </div>

      {/* Part 1: Side-by-Side Comparison of Selected Vehicles from Dock */}
      {comparisonCars.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#000000] flex items-center gap-2 font-display">
                <Sparkles className="w-4 h-4 text-[#000000]" />
                Selected Vehicles Comparison Dock ({comparisonCars.length})
              </h2>

              <p className="text-[11px] text-stone-500">
                Direct specification, CIF, and landed cost matrix
              </p>
            </div>

            <button
              onClick={clearCompare}
              className="text-xs text-[#000000] hover:text-[#295135] flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[650px]">
              {comparisonCars.map((car) => {
                const badge = getSourceBadgeInfo(car.source);
                const isLocal = car.source === 'peachcars';
                const isImport = !isLocal;

                const estLanded = isImport
                  ? Math.round(
                      ((car.price_usd || 0) + 1600) * usdKesRate * 1.78 +
                        95000
                    )
                  : car.price_kes || 0;

                const images = parseListingImages(car.images);
                const img = images[0] || CAR_PLACEHOLDER_SVG;

                return (
                  <div
                    key={car.id}
                    className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 flex flex-col justify-between space-y-3 relative group"
                  >
                    <button
                      onClick={() => removeFromCompare(car.id)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white text-stone-400 hover:text-[#000000] border border-stone-200 shadow-2xs z-10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-2.5">
                      <div className="aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                        <img
                          src={img}
                          alt={car.model}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}
                        >
                          {badge.shortLabel}
                        </span>

                        <h3 className="text-xs font-bold text-[#000000] mt-1 line-clamp-1 font-display">
                          {car.year} {car.make} {car.model}
                        </h3>
                      </div>

                      <div className="space-y-1 text-xs text-stone-700">
                        {isImport ? (
                          <>
                            <div className="flex justify-between py-1 border-b border-[#000000]/8">
                              <span className="text-stone-500">
                                Japan Price (USD)
                              </span>

                              <span className="font-bold font-mono-num text-stone-800">
                                {formatUSD(car.price_usd || 0)}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-[#000000]/8">
                              <span className="text-[#000000] font-bold">
                                Estimated Landed (KES)
                              </span>

                              <span className="font-extrabold font-mono-num text-[#000000]">
                                {formatKES(estLanded)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between py-1 border-b border-[#000000]/8">
                            <span className="text-[#000000] font-bold">
                              Final Local Price
                            </span>

                            <span className="font-extrabold font-mono-num text-[#000000]">
                              {formatKES(car.price_kes || 0)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between py-1 border-b border-[#000000]/8">
                          <span className="text-stone-500">Mileage</span>

                          <span className="font-mono-num font-medium">
                            {formatKm(car.mileage_km)}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-[#000000]/8">
                          <span className="text-stone-500">Engine</span>

                          <span className="font-mono-num font-medium">
                            {formatCC(car.engine_cc)}
                          </span>
                        </div>

                        <div className="flex justify-between py-1">
                          <span className="text-stone-500">
                            Auction Grade
                          </span>

                          <span className="text-[#000000] font-bold">
                            {isImport
                              ? car.auction_grade || '4.0'
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom action */}
                      <div className="pt-2 border-t border-[#000000]/10">
                        {isImport ? (
                          <button
                            onClick={() => openDutyModal(car)}
                            className="w-full py-1.5 bg-[#000000] hover:bg-[#295135] text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            Duty Breakdown Slip
                          </button>
                        ) : (
                          <div className="w-full py-1.5 rounded-xl bg-[#F6F7EB] text-[#295135] text-xs font-bold text-center">
                            Final Kenyan Market Price
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Part 2: Interactive Model Benchmark Explorer */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#000000] font-display">
              Live Vehicle Benchmark Calculator
            </h2>

            <p className="text-xs text-stone-500">
              Pick any make and model to compute live import savings against
              Kenya dealership averages
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              aria-label="Select make to benchmark"
              className="bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-3 py-1.5 text-xs text-[#000000] font-bold focus:outline-none focus:border-[#000000] cursor-pointer"
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
              className="bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-3 py-1.5 text-xs text-[#000000] font-bold focus:outline-none focus:border-[#000000] cursor-pointer"
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
              className="bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-3 py-1.5 text-xs text-[#000000] font-mono-num font-bold focus:outline-none focus:border-[#000000] cursor-pointer"
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
          <div className="py-10 flex flex-col items-center justify-center text-stone-500 space-y-2">
            <div className="w-6 h-6 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>

            <p className="text-xs font-semibold">
              Comparing Japan exporter prices & local Kenyan dealership
              listings...
            </p>
          </div>
        ) : benchmarkResult ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#000000] text-white shadow-md grid grid-cols-1 md:grid-cols-3 gap-5 items-center border border-[#295135]">
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold text-stone-300">
                  Japan Direct Import (Landed KES)
                </span>

                <div className="text-xl sm:text-2xl font-extrabold font-mono-num text-white">
                  {formatKES(
                    benchmarkResult.import?.median_kes ??
                      (benchmarkResult as any).import_landed
                        ?.median_kes ??
                      0
                  )}
                </div>

                <p className="text-xs text-stone-300">
                  FOB{' '}
                  {formatUSD(
                    benchmarkResult.import?.best_purchase_usd ??
                      (benchmarkResult as any).japan_cif?.median_usd ??
                      0
                  )}{' '}
                  + KRA Duty & Port
                </p>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#295135] pt-3 md:pt-0 md:pl-5">
                <span className="text-[11px] uppercase font-bold text-stone-300">
                  Kenyan Showroom Median
                </span>

                <div className="text-xl sm:text-2xl font-extrabold font-mono-num text-stone-200">
                  {formatKES(
                    benchmarkResult.local?.median_kes ?? 0
                  )}
                </div>

                <p className="text-xs text-stone-300">
                  Based on verified Kenyan stock
                </p>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#295135] pt-3 md:pt-0 md:pl-5 bg-[#295135]/80 -m-3 p-4 rounded-xl border border-[#6BD425]/20">
                <span className="text-[11px] uppercase font-bold text-[#6BD425] flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Direct Import Savings
                </span>

                <div className="text-2xl font-black font-mono-num text-white">
                  +{formatKES(benchmarkResult.saving_kes || 0)}
                </div>

                <p className="text-xs text-[#6BD425] font-bold">
                  Save {benchmarkResult.saving_pct || 0}% on average
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Part 3: Top Savings Ranking Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#000000] font-display">
              Top High-Yield Import Vehicles
            </h3>

            <p className="text-xs text-stone-500">
              Vehicles with the highest price spread between Japan auctions
              and Kenyan dealerships
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#000000]/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#000000] text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Make & Model</th>
                <th className="py-2.5 px-3">Japan Landed Median</th>
                <th className="py-2.5 px-3">Kenyan Dealer Median</th>
                <th className="py-2.5 px-3">Net Cash Saved</th>
                <th className="py-2.5 px-3">Margin (%)</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 text-stone-800">
              {savingsSummary.map((item, idx) => (
                <tr
                  key={`${item.make}-${item.model}-${idx}`}
                  className="hover:bg-[#FFFFFF]/70 transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-[#000000] font-display">
                    {item.make} {item.model}
                  </td>

                  <td className="py-3 px-3 font-mono-num font-semibold text-stone-700">
                    {formatKES(
                      item.total_landed_kes ??
                        item.import_median_kes ??
                        0
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono-num text-stone-400 line-through">
                    {formatKES(
                      item.median_local_kes ??
                        item.local_median_kes ??
                        0
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono-num font-black text-[#000000]">
                    +{formatKES(item.saving_kes)}
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#000000] text-[#6BD425] font-bold font-mono-num text-[10px]">
                      {item.saving_pct}%
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/marketplace?make=${encodeURIComponent(
                        item.make
                      )}&model=${encodeURIComponent(item.model)}`}
                      className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] hover:bg-[#000000] hover:text-white text-stone-800 font-bold text-[11px] transition-colors border border-[#000000]/10"
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
