import React from 'react';
import { Link } from 'react-router-dom';
import { CarListing } from '../types';
import { useApp } from '../context/AppContext';
import { formatKES, formatUSD, formatKm, formatCC, getSourceBadgeInfo, parseListingImages, CAR_PLACEHOLDER_SVG } from '../utils/formatters';
import {
  Heart,
  GitCompare,
  Calculator,
  Fuel,
  Gauge,
  Calendar,
  MapPin,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface CarCardProps {
  car: CarListing;
  estimatedLandedKes?: number;
}

export const CarCard: React.FC<CarCardProps> = ({ car, estimatedLandedKes }) => {
  const { isCarSaved, toggleSaveCar, isComparing, addToCompare, openDutyModal, usdKesRate } = useApp();

  const isSaved = isCarSaved(car.id);
  const comparing = isComparing(car.id);
  const badge = getSourceBadgeInfo(car.source);
  const isImport = car.source !== 'peachcars';

  // Calculate approximate landed cost if not provided
  const priceUsd = car.price_usd || (car.price_kes ? car.price_kes / usdKesRate : 0);
  const calculatedLandedKes =
    estimatedLandedKes ||
    (isImport
      ? Math.round((priceUsd + 1600) * usdKesRate * 1.78 + 95000)
      : car.price_kes || priceUsd * usdKesRate);

  const images = parseListingImages(car.images);
  const primaryImage = images[0] || CAR_PLACEHOLDER_SVG;

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white border border-stone-200 shadow-2xs hover:border-stone-300 hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Top Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={primaryImage}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="h-full w-full object-cover object-center group-hover:scale-103 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = CAR_PLACEHOLDER_SVG;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>

        {/* Source Badge & Auction Grade */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          {car.url ? (
            <a
              href={car.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={`View listing on ${badge.label}`}
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 hover:opacity-90 transition-opacity ${badge.bg}`}
            >
              <span>{badge.shortLabel}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          ) : (
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs ${badge.bg}`}>
              {badge.shortLabel}
            </span>
          )}
          {car.auction_grade && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/95 text-stone-800 border border-stone-200 shadow-xs backdrop-blur-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0E402D]" />
              Grade {car.auction_grade}
            </span>
          )}
        </div>

        {/* Action icons (Bookmark & Compare) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCompare(car);
            }}
            title={comparing ? 'Remove from compare' : 'Add to compare'}
            className={`p-1.5 rounded-lg backdrop-blur-sm border transition-all ${
              comparing
                ? 'bg-[#000000] text-white border-[#000000] shadow-xs'
                : 'bg-white/90 text-stone-700 hover:text-stone-900 border-stone-200 hover:bg-white shadow-2xs'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSaveCar(car);
            }}
            title={isSaved ? 'Remove from watchlist' : 'Save to watchlist'}
            className={`p-1.5 rounded-lg backdrop-blur-sm border transition-all ${
              isSaved
                ? 'bg-[#0E402D] text-[#9FCC2E] border-[#0E402D] shadow-xs'
                : 'bg-white/90 text-stone-700 hover:text-[#0E402D] border-stone-200 hover:bg-white shadow-2xs'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Location & Drive type pill */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10 text-xs">
            <MapPin className="w-3 h-3 text-stone-300" />
            {car.location || (isImport ? 'Yokohama, Japan' : 'Nairobi, Kenya')}
          </span>
          {car.drive_type && (
            <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-mono uppercase">
              {car.drive_type}
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/listings/${car.id}`}
              className="text-base sm:text-lg font-bold text-[#000000] group-hover:text-[#0E402D] transition-colors line-clamp-1 font-display"
            >
              {car.year} {car.make} {car.model}
            </Link>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-stone-600">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-stone-50 border border-stone-200/70">
              <Gauge className="w-3.5 h-3.5 text-[#5A6650] shrink-0" />
              <span className="truncate font-mono-num">{formatKm(car.mileage_km)}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-stone-50 border border-stone-200/70">
              <Fuel className="w-3.5 h-3.5 text-[#5A6650] shrink-0" />
              <span className="truncate capitalize">{car.fuel_type || 'Petrol'}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-stone-50 border border-stone-200/70">
              <Calendar className="w-3.5 h-3.5 text-[#5A6650] shrink-0" />
              <span className="truncate font-mono-num">{formatCC(car.engine_cc)}</span>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="pt-3 border-t border-stone-100 space-y-2">
          {isImport ? (
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#5A6650] block">
                  Japan CIF (USD)
                </span>
                <span className="text-sm font-semibold font-mono-num text-stone-800">
                  {formatUSD(car.price_usd)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#0E402D] flex items-center gap-1 justify-end">
                  <Shield className="w-3 h-3 text-[#295135]" /> Landed Nairobi (Est)
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono-num text-[#000000]">
                  {formatKES(calculatedLandedKes)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#5A6650] block">
                  Availability
                </span>
                <span className="text-xs font-medium text-emerald-900 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-[#0E402D]" /> Kenyan Showroom
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-[#5A6650] block">
                  Showroom Price
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono-num text-[#000000]">
                  {formatKES(car.price_kes)}
                </span>
              </div>
            </div>
          )}

          {/* Action Button Row */}
          <div className={`grid ${car.url ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 pt-1`}>
            <button
              onClick={() => openDutyModal(car)}
              className="w-full py-2 px-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-stone-200"
              title="Calculate KRA import duty breakdown"
            >
              <Calculator className="w-3 h-3 text-[#295135] shrink-0" />
              <span>Duty Slip</span>
            </button>

            {car.url && (
              <a
                href={car.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full py-2 px-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-stone-200"
                title={`View original listing on ${badge.label}`}
              >
                <ExternalLink className="w-3 h-3 text-[#295135] shrink-0" />
                <span className="truncate">Source</span>
              </a>
            )}

            <Link
              to={`/listings/${car.id}`}
              className="w-full py-2 px-1.5 rounded-lg bg-[#0E402D] hover:bg-[#295135] text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors shadow-2xs"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3 h-3 shrink-0 text-[#9FCC2E]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
