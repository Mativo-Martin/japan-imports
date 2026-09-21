import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CarListing, FilterParams } from '../types';
import { CarCard } from '../components/CarCard';
import { useApp } from '../context/AppContext';
import { formatKES, formatUSD, formatKm, formatCC, getSourceBadgeInfo, parseListingImages } from '../utils/formatters';
import {
  Search as SearchIcon,
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  LayoutGrid,
  List,
  ArrowUpDown,
  Car,
} from 'lucide-react';

export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { usdKesRate, openDutyModal } = useApp();

  const [listings, setListings] = useState<CarListing[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Metadata for filter options
  const [makesList, setMakesList] = useState<{ make: string; count: number }[]>([]);
  const [modelsList, setModelsList] = useState<{ model: string; count: number }[]>([]);

  // Filter state extracted from searchParams
  const q = searchParams.get('q') || '';
  const source = searchParams.get('source') || '';
  const make = searchParams.get('make') || '';
  const model = searchParams.get('model') || '';
  const bodyType = searchParams.get('body_type') || '';
  const driveType = searchParams.get('drive_type') || '';
  const fuelType = searchParams.get('fuel_type') || '';
  const yearMin = searchParams.get('year_min') || '';
  const yearMax = searchParams.get('year_max') || '';
  const priceMin = searchParams.get('price_min') || '';
  const priceMax = searchParams.get('price_max') || '';
  const sortBy = searchParams.get('sort_by') || 'price_usd';
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc';

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load makes list once on mount
  useEffect(() => {
    apiClient.getMakes().then(setMakesList).catch(console.error);
  }, []);

  // Update models list when make changes
  useEffect(() => {
    apiClient.getModels(make || undefined).then(setModelsList).catch(console.error);
  }, [make]);

  // Fetch listings optimized with useCallback and including price filters in dependencies
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: FilterParams = {
        q: q || undefined,
        source: source || undefined,
        make: make || undefined,
        model: model || undefined,
        body_type: bodyType || undefined,
        drive_type: driveType || undefined,
        fuel_type: fuelType || undefined,
        year_min: yearMin ? parseInt(yearMin, 10) : undefined,
        year_max: yearMax ? parseInt(yearMax, 10) : undefined,
        price_min: priceMin ? parseFloat(priceMin) : undefined,
        price_max: priceMax ? parseFloat(priceMax) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page_size: 50,
      };

      const res = await apiClient.getListings(params);
      setListings(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  }, [q, source, make, model, bodyType, driveType, fuelType, yearMin, yearMax, priceMin, priceMax, sortBy, sortOrder]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (q) count++;
    if (source) count++;
    if (make) count++;
    if (model) count++;
    if (bodyType) count++;
    if (driveType) count++;
    if (fuelType) count++;
    if (yearMin || yearMax) count++;
    if (priceMin || priceMax) count++;
    return count;
  }, [q, source, make, model, bodyType, driveType, fuelType, yearMin, yearMax, priceMin, priceMax]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header bar: Search input + View switch + Mobile Filter button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-display">
            Japanese Inventory & Market Catalog
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Browse {total} verified vehicles from Japan exporters & Kenyan dealer showrooms
          </p>
        </div>

        {/* View Mode & Filter Trigger */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-800 shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 text-[#0E402D]" />
            <span>Filters ({activeFiltersCount})</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                updateParam('sort_by', sb);
                updateParam('sort_order', so);
              }}
              aria-label="Sort listings"
              className="bg-transparent text-stone-800 text-xs focus:outline-none cursor-pointer pr-2"
            >
              <option value="id:asc">Default (ID)</option>
              <option value="price_usd:asc">Lowest CIF Price (USD)</option>
              <option value="price_usd:desc">Highest CIF Price (USD)</option>
              <option value="year:desc">Newest Year (2021+)</option>
              <option value="mileage_km:asc">Lowest Mileage</option>
            </select>
          </div>

          {/* Grid / Table Toggle */}
          <div className="hidden sm:flex items-center bg-white border border-stone-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'
                }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Filters */}
        <aside
          className={`lg:col-span-3 space-y-6 ${mobileFilterOpen ? 'block' : 'hidden lg:block'
            } p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs h-fit`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0E402D]" />
              <span className="font-bold text-stone-900 text-sm font-display">Filter Criteria</span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#0E402D] hover:text-[#295135] flex items-center gap-1 font-semibold transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Keyword Search */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700">Keyword Search</label>
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Harrier, Hybrid, White, AWD..."
                value={q}
                onChange={(e) => updateParam('q', e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
              />
              {q && (
                <button
                  onClick={() => updateParam('q', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Source Inventory Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700">Listing Source</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: '', label: 'All Sources' },
                { id: 'beforward', label: 'BeForward' },
                { id: 'sbt', label: 'SBT Japan' },
                { id: 'peachcars', label: 'PeachCars (KE)' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateParam('source', s.id)}
                  className={`py-1.5 px-2 rounded-lg text-left truncate transition-all text-[11px] font-medium ${source === s.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 border border-stone-200/70 hover:bg-stone-100'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Make Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700">Vehicle Make</label>
            <select
              value={make}
              onChange={(e) => {
                updateParam('make', e.target.value);
                updateParam('model', '');
              }}
              aria-label="Filter by vehicle make"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-400 cursor-pointer"
            >
              <option value="">All Makes (Toyota, Mazda, Subaru...)</option>
              {makesList.map((m) => (
                <option key={m.make} value={m.make}>
                  {m.make} ({m.count})
                </option>
              ))}
            </select>
          </div>

          {/* Model Dropdown */}
          {modelsList.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Vehicle Model</label>
              <select
                value={model}
                onChange={(e) => updateParam('model', e.target.value)}
                aria-label="Filter by vehicle model"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-400 cursor-pointer"
              >
                <option value="">All Models</option>
                {modelsList.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.model} ({m.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Body Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700">Body Type</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: '', label: 'All' },
                { id: 'suv', label: 'SUV' },
                { id: 'sedan', label: 'Sedan' },
                { id: 'hatchback', label: 'Hatchback' },
                { id: 'wagon', label: 'Wagon' },
                { id: 'minivan', label: 'Minivan' },
              ].map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => updateParam('body_type', bt.id)}
                  className={`py-1.5 px-2 rounded-lg text-center capitalize transition-all text-[11px] font-medium ${bodyType === bt.id
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-50 text-stone-600 border border-stone-200/70 hover:bg-stone-100'
                    }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Year Range (KRA 8-year age rule: 2018–2026) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex justify-between">
              <span>Year of Registration</span>
              <span className="text-[10px] text-[#0E402D] font-semibold">KRA 8-Yr Limit</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min (e.g. 2019)"
                min="2018"
                max="2026"
                value={yearMin}
                onChange={(e) => updateParam('year_min', e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 font-mono-num"
              />
              <input
                type="number"
                placeholder="Max (e.g. 2024)"
                min="2018"
                max="2026"
                value={yearMax}
                onChange={(e) => updateParam('year_max', e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 font-mono-num"
              />
            </div>
          </div>

          {/* Drive & Fuel Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Drivetrain</label>
              <select
                value={driveType}
                onChange={(e) => updateParam('drive_type', e.target.value)}
                aria-label="Filter by drivetrain"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-400 cursor-pointer"
              >
                <option value="">All</option>
                <option value="2wd">2WD</option>
                <option value="4wd">4WD</option>
                <option value="awd">AWD</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Fuel Type</label>
              <select
                value={fuelType}
                onChange={(e) => updateParam('fuel_type', e.target.value)}
                aria-label="Filter by fuel type"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-400 cursor-pointer"
              >
                <option value="">All</option>
                <option value="petrol">Petrol</option>
                <option value="hybrid">Hybrid</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Listings Display Area */}
        <main className="lg:col-span-9 space-y-6">
          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-stone-400 text-[11px]">Active Filters:</span>
              {q && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 flex items-center gap-1.5">
                  <span>Search: {q}</span>
                  <button onClick={() => updateParam('q', '')} className="hover:text-[#0E402D]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {source && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 flex items-center gap-1.5">
                  <span>Source: {source}</span>
                  <button onClick={() => updateParam('source', '')} className="hover:text-[#0E402D]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {make && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 flex items-center gap-1.5">
                  <span>Make: {make}</span>
                  <button onClick={() => updateParam('make', '')} className="hover:text-[#0E402D]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bodyType && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 flex items-center gap-1.5 uppercase">
                  <span>{bodyType}</span>
                  <button onClick={() => updateParam('body_type', '')} className="hover:text-[#0E402D]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-4 ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-stone-500 space-y-3">
              <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Retrieving vehicles and calculating landed taxes...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-stone-200 space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-800 font-display">No matching vehicles found</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or resetting filters to view all available Japan and Kenyan stock.
                </p>
              </div>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            /* Table / Matrix View */
            <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-3">Specs</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3">CIF (USD)</th>
                    <th className="py-3 px-3">Landed (KES)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {listings.map((car) => {
                    const badge = getSourceBadgeInfo(car.source);
                    const isImport = car.source !== 'peachcars';
                    const priceUsd = car.price_usd || (car.price_kes ? car.price_kes / usdKesRate : 0);
                    const estimatedLanded = isImport
                      ? Math.round((priceUsd + 1600) * usdKesRate * 1.78 + 95000)
                      : car.price_kes || 0;

                    return (
                      <tr key={car.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-3">
                            <img
                              src={parseListingImages(car.images)[0]}
                              alt={car.model}
                              className="w-12 h-9 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold text-stone-900 block font-display">
                                {car.year} {car.make} {car.model}
                              </span>
                              <span className="text-[11px] text-stone-500">{car.body_type?.toUpperCase()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono-num text-stone-700">
                          <div>{formatKm(car.mileage_km)}</div>
                          <div className="text-stone-400 text-[10px]">{formatCC(car.engine_cc)} • {car.fuel_type}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg}`}>
                            {badge.shortLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono-num font-semibold text-stone-700">
                          {formatUSD(car.price_usd)}
                        </td>
                        <td className="py-3.5 px-3 font-mono-num font-bold text-stone-900">
                          {formatKES(estimatedLanded)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openDutyModal(car)}
                            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-[11px] transition-colors border border-stone-200"
                          >
                            Duty Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};