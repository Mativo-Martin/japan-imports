import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CarListing, FilterParams } from '../types';
import { useApp } from '../context/AppContext';
import { CarCard } from '../components/CarCard';
import { formatKES, formatUSD, formatKm, formatCC, getSourceBadgeInfo, parseListingImages } from '../utils/formatters';
import {
  Search as SearchIcon,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  RotateCcw,
  SlidersHorizontal,
  X,
  Car,
} from 'lucide-react';

export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openDutyModal, usdKesRate } = useApp();

  const [listings, setListings] = useState<CarListing[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
  const sortOrder = (searchParams.get('sort_order') === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load makes list once on mount
  useEffect(() => {
    apiClient.getMakes().then(setMakesList).catch(console.error);
  }, []);

  // Fetch models whenever make changes
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header bar: Search input + View switch + Mobile Filter button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#000000] tracking-tight font-display">
            Direct Import & Local Market Inventory
          </h1>
          <p className="text-xs text-stone-500">
            Browse {total} verified vehicles with landed duty calculations
          </p>
        </div>

        {/* View Mode & Filter Trigger */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#000000]/15 text-xs font-bold text-[#000000] shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 text-[#000000]" />
            <span>Filters ({activeFiltersCount})</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-[#000000]/15 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#295135] shrink-0" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                updateParam('sort_by', sb);
                updateParam('sort_order', so);
              }}
              aria-label="Sort listings"
              className="bg-transparent text-[#000000] font-semibold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="price_usd:asc">Lowest CIF Price (USD)</option>
              <option value="price_usd:desc">Highest CIF Price (USD)</option>
              <option value="year:desc">Newest Year (2021+)</option>
              <option value="mileage_km:asc">Lowest Mileage</option>
              <option value="id:asc">Default</option>
            </select>
          </div>

          {/* Grid / Table Toggle */}
          <div className="hidden sm:flex items-center bg-white border border-[#000000]/15 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#000000] text-[#6BD425]' : 'text-stone-500 hover:text-black'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[#000000] text-[#6BD425]' : 'text-stone-500 hover:text-black'
                }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <aside
          className={`lg:col-span-3 space-y-4 ${mobileFilterOpen ? 'block' : 'hidden lg:block'
            } p-4 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs h-fit`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#000000]" />
              <span className="font-bold text-[#000000] text-xs uppercase tracking-wider font-display">
                Filters
              </span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#000000] hover:text-[#295135] flex items-center gap-1 font-bold transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Keyword Search */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#000000]">Search Keyword</label>
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Model, fuel, color..."
                value={q}
                onChange={(e) => updateParam('q', e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-[#000000] placeholder:text-stone-400 focus:outline-none focus:border-[#000000]"
              />
              {q && (
                <button
                  onClick={() => updateParam('q', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Source Inventory Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#000000]">Inventory Source</label>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {[
                { id: '', label: 'All Sources' },
                { id: 'beforward', label: 'BE FORWARD' },
                { id: 'sbt', label: 'SBT Japan' },
                { id: 'peachcars', label: 'PeachCars KE' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateParam('source', s.id)}
                  className={`py-1.5 px-2 rounded-lg text-left truncate transition-all text-[11px] font-bold ${source === s.id
                    ? 'bg-[#000000] text-white shadow-xs'
                    : 'bg-[#FFFFFF] text-stone-700 border border-[#000000]/8 hover:bg-stone-200'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Make Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#000000]">Vehicle Make</label>
            <select
              value={make}
              onChange={(e) => {
                updateParam('make', e.target.value);
                updateParam('model', '');
              }}
              aria-label="Filter by vehicle make"
              className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-2.5 py-1.5 text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000] cursor-pointer"
            >
              <option value="">All Makes (Toyota, Nissan, Mazda...)</option>
              {makesList.map((m) => (
                <option key={m.make} value={m.make}>
                  {m.make} ({m.count})
                </option>
              ))}
            </select>
          </div>

          {/* Model Dropdown */}
          {modelsList.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#000000]">Vehicle Model</label>
              <select
                value={model}
                onChange={(e) => updateParam('model', e.target.value)}
                aria-label="Filter by vehicle model"
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-2.5 py-1.5 text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000] cursor-pointer"
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
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#000000]">Body Type</label>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {[
                { id: '', label: 'All' },
                { id: 'suv', label: 'SUV' },
                { id: 'sedan', label: 'Sedan' },
                { id: 'hatchback', label: 'Hatch' },
                { id: 'van', label: 'Van' },
                { id: 'wagon', label: 'Wagon' },
              ].map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => updateParam('body_type', bt.id)}
                  className={`py-1.5 px-1 rounded-lg text-center capitalize transition-all text-[11px] font-bold ${bodyType === bt.id
                    ? 'bg-[#000000] text-white'
                    : 'bg-[#FFFFFF] text-stone-700 border border-[#000000]/8 hover:bg-stone-200'
                    }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Year Range */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#000000] flex justify-between">
              <span>Registration Year</span>
              <span className="text-[10px] text-[#000000] font-bold">KRA 8-Yr Rule</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                placeholder="Min 2018"
                min="2018"
                max="2026"
                value={yearMin}
                onChange={(e) => updateParam('year_min', e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-2.5 py-1.5 text-xs text-[#000000] focus:outline-none focus:border-[#000000] font-mono-num font-semibold"
              />
              <input
                type="number"
                placeholder="Max 2026"
                min="2018"
                max="2026"
                value={yearMax}
                onChange={(e) => updateParam('year_max', e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-2.5 py-1.5 text-xs text-[#000000] focus:outline-none focus:border-[#000000] font-mono-num font-semibold"
              />
            </div>
          </div>

          {/* Fuel & Drivetrain */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#000000]">Fuel</label>
              <select
                value={fuelType}
                onChange={(e) => updateParam('fuel_type', e.target.value)}
                aria-label="Filter by fuel type"
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-2 py-1.5 text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000] cursor-pointer"
              >
                <option value="">All</option>
                <option value="petrol">Petrol</option>
                <option value="hybrid">Hybrid</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#000000]">Drivetrain</label>
              <select
                value={driveType}
                onChange={(e) => updateParam('drive_type', e.target.value)}
                aria-label="Filter by drivetrain"
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-2 py-1.5 text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000] cursor-pointer"
              >
                <option value="">All</option>
                <option value="2wd">2WD</option>
                <option value="4wd">4WD</option>
                <option value="awd">AWD</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Listings Display Area */}
        <main className="lg:col-span-9 space-y-4">
          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-stone-500 text-[11px] font-bold">Active:</span>
              {q && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#000000] text-[#6BD425] text-xs font-semibold flex items-center gap-1">
                  <span>Search: {q}</span>
                  <button onClick={() => updateParam('q', '')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {source && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#000000] text-[#6BD425] text-xs font-semibold flex items-center gap-1 uppercase">
                  <span>{source}</span>
                  <button onClick={() => updateParam('source', '')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {make && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#000000] text-[#6BD425] text-xs font-semibold flex items-center gap-1">
                  <span>{make}</span>
                  <button onClick={() => updateParam('make', '')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bodyType && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#000000] text-[#6BD425] text-xs font-semibold flex items-center gap-1 uppercase">
                  <span>{bodyType}</span>
                  <button onClick={() => updateParam('body_type', '')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#000000] hover:underline ml-1 font-bold"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500 space-y-2">
              <div className="w-7 h-7 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-stone-700">Loading verified inventory...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white border border-[#000000]/10 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#FFFFFF] mx-auto flex items-center justify-center text-[#000000]">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#000000] font-display">No matching vehicles found</h3>
                <p className="text-xs text-stone-500 mt-0.5 max-w-sm mx-auto">
                  Adjust your filters or reset to see all available inventory from Japan & Kenya.
                </p>
              </div>
              <button
                onClick={clearAllFilters}
                className="px-4 py-1.5 bg-[#000000] hover:bg-[#295135] text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            /* Table / Matrix View */
            <div className="rounded-2xl bg-white border border-[#000000]/10 overflow-hidden shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#000000] text-white font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Vehicle</th>
                    <th className="py-2.5 px-3">Specs</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">CIF (USD)</th>
                    <th className="py-2.5 px-3">Landed (KES)</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
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
                      <tr key={car.id} className="hover:bg-[#FFFFFF]/70 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={parseListingImages(car.images)[0]}
                              alt={car.model}
                              className="w-11 h-8 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold text-[#000000] block font-display">
                                {car.year} {car.make} {car.model}
                              </span>
                              <span className="text-[10px] text-[#295135] font-semibold">{car.body_type?.toUpperCase()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono-num text-stone-700">
                          <div className="font-semibold">{formatKm(car.mileage_km)}</div>
                          <div className="text-stone-400 text-[10px]">{formatCC(car.engine_cc)} • {car.fuel_type}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                            {badge.shortLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono-num font-bold text-stone-800">
                          {formatUSD(car.price_usd)}
                        </td>
                        <td className="py-3 px-3 font-mono-num font-black text-[#000000]">
                          {formatKES(estimatedLanded)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openDutyModal(car)}
                            className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] hover:bg-[#000000] hover:text-white text-stone-800 font-bold text-[11px] transition-colors border border-[#000000]/10"
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