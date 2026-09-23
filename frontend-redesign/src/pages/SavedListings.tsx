import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CarCard } from '../components/CarCard';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Trash2, Copy, Check } from 'lucide-react';
import { formatKES, formatUSD } from '../utils/formatters';

export const SavedListings: React.FC = () => {
  const { savedCars, clearSavedCars, usdKesRate, showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    if (savedCars.length === 0) return;
    const text = savedCars
      .map(
        (c) =>
          `• ${c.year} ${c.make} ${c.model} - CIF: ${formatUSD(c.price_usd)} | Landed: ${formatKES(
            (c.price_usd || 0) * usdKesRate * 1.78 + 95000
          )} | Mileage: ${c.mileage_km}km | Source: ${c.source}`
      )
      .join('\n');

    navigator.clipboard.writeText(`MY SAVED VEHICLES (${savedCars.length}):\n` + text);
    setCopied(true);
    showToast('Saved List Copied', 'Summary exported to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#000000]/10 border border-[#000000]/20 text-[#000000] text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-current text-[#000000]" />
            <span>Personal Watchlist & Import Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#000000] tracking-tight font-display">
            Saved Vehicles ({savedCars.length})
          </h1>
          <p className="text-xs sm:text-sm text-[#295135] mt-1">
            Track price movements, generate combined duty quotes, and compare your favorite imports.
          </p>
        </div>

        {savedCars.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FFFFFF] border border-[#000000]/20 text-xs font-semibold text-[#000000] shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-[#000000]" /> : <Copy className="w-4 h-4 text-[#295135]" />}
              <span>{copied ? 'Copied List' : 'Export List'}</span>
            </button>

            <button
              onClick={clearSavedCars}
              className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-[#000000]/20 hover:border-rose-200 text-xs font-semibold text-rose-600 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {savedCars.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-[#000000]/15 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#000000]/10 border border-[#000000]/20 mx-auto flex items-center justify-center text-[#000000]">
            <Heart className="w-6 h-6 text-[#000000]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#000000] font-display">Your watchlist is empty</h3>
            <p className="text-xs text-[#295135] max-w-sm mx-auto">
              Save vehicles from the marketplace to keep track of Japanese CIF prices and KRA tax estimates.
            </p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center px-5 py-2.5 bg-[#000000] hover:bg-[#295135] text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span>Explore Marketplace</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-[#6BD425]" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedCars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedListings;
