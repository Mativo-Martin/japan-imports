import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CarListing, ImportCostBreakdown, ComparisonResult } from '../types';
import { useApp } from '../context/AppContext';
import { formatKES, formatUSD, formatKm, formatCC, getSourceBadgeInfo, parseListingImages, CAR_PLACEHOLDER_SVG } from '../utils/formatters';
import {
  ShieldCheck,
  Calculator,
  Heart,
  GitCompare,
  ArrowLeft,
  CheckCircle2,
  Anchor,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Copy,
  TrendingDown,
  Check,
} from 'lucide-react';

export const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCarSaved, toggleSaveCar, isComparing, addToCompare, openDutyModal, usdKesRate, showToast } = useApp();

  const [car, setCar] = useState<CarListing | null>(null);
  const [breakdown, setBreakdown] = useState<ImportCostBreakdown | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [relatedCars, setRelatedCars] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCar = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const carData = await apiClient.getListingById(parseInt(id, 10));
        setCar(carData);

        const isImportListing = carData.source !== 'peachcars';

        // Only compute duty breakdown for import listings
        let dutyData: ImportCostBreakdown | null = null;
        if (isImportListing) {
          const purchaseUsd = carData.price_usd || (carData.price_kes ? carData.price_kes / usdKesRate : 5000);
          dutyData = await apiClient.calculateImportCost({
            purchase_usd: purchaseUsd,
            body_type: carData.body_type,
          });
        }

        const [compData, relatedData] = await Promise.all([
          apiClient.compareVehicles(carData.make, carData.model, carData.year).catch(() => null),
          apiClient.getListings({ make: carData.make, page_size: 4 }).catch(() => ({ data: [] })),
        ]);

        setBreakdown(dutyData);
        setComparison(compData);
        setRelatedCars(relatedData.data.filter((c) => c.id !== carData.id).slice(0, 3));
      } catch (err) {
        console.error('Error loading car details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCar();
  }, [id, usdKesRate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-[#295135] space-y-3">
        <div className="w-8 h-8 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading vehicle profile and computing KRA tax schedule...</p>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#000000] font-display">Vehicle Not Found</h2>
        <p className="text-sm text-[#295135] max-w-sm mx-auto">
          The listing you are searching for might have been sold, removed, or is temporarily unavailable.
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex px-5 py-2.5 bg-[#000000] hover:bg-[#295135] text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  const badge = getSourceBadgeInfo(car.source);
  const isSaved = isCarSaved(car.id);
  const comparing = isComparing(car.id);
  const images = parseListingImages(car.images);
  const isImport = car.source !== 'peachcars';

  const handleCopyQuote = () => {
    if (isImport && breakdown) {
      const text = `
KENYA VEHICLE IMPORT QUOTE (JapanEazy):
Vehicle: ${car.year} ${car.make} ${car.model} (${car.body_type?.toUpperCase()})
Japan Auction/CIF: ${formatUSD(breakdown.purchase_usd)} (${formatKES(breakdown.purchase_usd * breakdown.usd_kes_rate)})
Total KRA Taxes: ${formatKES(breakdown.tax_total_kes)}
Port & CFS Fees: ${formatKES(breakdown.charges_total_kes)}
Estimated Landed Nairobi: ${formatKES(breakdown.total_import_kes)}
Exchange Rate: 1 USD = ${breakdown.usd_kes_rate} KES
      `.trim();
      navigator.clipboard.writeText(text);
    } else {
      const text = `
KENYAN MARKET LISTING (JapanEazy):
Vehicle: ${car.year} ${car.make} ${car.model} (${car.body_type?.toUpperCase()})
Showroom Price: ${formatKES(car.price_kes || 0)}
      `.trim();
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    showToast('Quote Copied', 'Vehicle quote copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#295135] hover:text-[#000000] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToCompare(car)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${comparing
              ? 'bg-[#000000] text-[#6BD425] border-[#000000]'
              : 'bg-white text-[#000000] border-[#000000]/20 hover:bg-[#FFFFFF]'
              }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{comparing ? 'In Compare Dock' : 'Add to Compare'}</span>
          </button>

          <button
            onClick={() => toggleSaveCar(car)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${isSaved
              ? 'bg-[#000000] text-[#6BD425] border-[#000000]'
              : 'bg-white text-[#000000] border-[#000000]/20 hover:bg-[#FFFFFF]'
              }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Vehicle Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery & Specs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Stage Image */}
          <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-100 border border-[#000000]/15 shadow-sm">
            <img
              src={images[activeImageIdx] || images[0] || CAR_PLACEHOLDER_SVG}
              alt={`${car.year} ${car.make} ${car.model}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                e.currentTarget.src = CAR_PLACEHOLDER_SVG;
              }}
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {car.url ? (
                <a
                  href={car.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity ${badge.bg}`}
                  title={`View original listing on ${badge.label}`}
                >
                  <span>{badge.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ) : (
                <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-xs ${badge.bg}`}>
                  {badge.label}
                </span>
              )}
              {car.auction_grade && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/95 text-[#000000] border border-[#000000]/20 shadow-xs backdrop-blur-sm flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#000000]" />
                  Grade {car.auction_grade}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIdx(index)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${activeImageIdx === index
                    ? 'border-[#000000] scale-105 shadow-2xs'
                    : 'border-[#000000]/20 opacity-70 hover:opacity-100'
                    }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = CAR_PLACEHOLDER_SVG;
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Technical Specs Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#000000]/15 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2 font-display">
              <FileText className="w-4 h-4 text-[#000000]" />
              Verified Vehicle Specifications
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#000000]/10 space-y-0.5">
                <span className="text-[#295135] block text-[10px]">Year / Manufacture</span>
                <span className="font-bold text-[#000000] font-mono-num">{car.year} (KRA Eligible)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#000000]/10 space-y-0.5">
                <span className="text-[#295135] block text-[10px]">Odometer Mileage</span>
                <span className="font-bold text-[#000000] font-mono-num">{formatKm(car.mileage_km)}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#000000]/10 space-y-0.5">
                <span className="text-[#295135] block text-[10px]">Engine Displacement</span>
                <span className="font-bold text-[#000000] font-mono-num">{formatCC(car.engine_cc)}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#000000]/10 space-y-0.5">
                <span className="text-[#295135] block text-[10px]">Fuel & Powertrain</span>
                <span className="font-bold text-[#000000] capitalize">{car.fuel_type || 'Petrol'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#000000]/10 space-y-0.5">
                <span className="text-[#295135] block text-[10px]">Drivetrain</span>
                <span className="font-bold text-[#000000]">{car.drive_type || '2WD'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#000000]/10 space-y-0.5">
                <span className="text-[#295135] block text-[10px]">Transmission</span>
                <span className="font-bold text-[#000000] capitalize">{car.transmission || 'Automatic'}</span>
              </div>
            </div>

            {/* Key Features Pill Cloud */}
            {car.features && car.features.length > 0 && (
              <div className="pt-3 border-t border-[#000000]/10">
                <span className="text-xs font-semibold text-[#295135] block mb-2">Equipped Options:</span>
                <div className="flex flex-wrap gap-2">
                  {car.features.map((feat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] text-[#000000] text-[11px] font-medium border border-[#000000]/15 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#000000]" />
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing, Landed Cost Breakdown, Savings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header Title Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#000000]/15 shadow-2xs space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[#295135] uppercase tracking-wider">{car.make}</span>
                <span className="text-[#000000]/30">•</span>
                <span className="text-xs text-[#295135]">{car.body_type?.toUpperCase() || 'VEHICLE'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#000000] font-display tracking-tight">
                {car.year} {car.make} {car.model}
              </h1>
            </div>

            {/* Dual Price Spotlight */}
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#000000]/15 space-y-3">
              {isImport ? (
                <>
                  <div className="flex items-baseline justify-between border-b border-[#000000]/15 pb-2">
                    <span className="text-xs text-[#295135] font-medium">Japan CIF / FOB Price:</span>
                    <span className="text-lg font-bold font-mono-num text-[#000000]">
                      {formatUSD(car.price_usd)}
                      <span className="text-xs text-[#295135] ml-1">
                        (≈ {formatKES((car.price_usd || 0) * usdKesRate)})
                      </span>
                    </span>
                  </div>

                  {breakdown && (
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs font-bold text-[#000000] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#000000]" /> Total Landed Nairobi:
                      </span>
                      <span className="text-2xl font-black font-mono-num text-[#000000]">
                        {formatKES(breakdown.total_import_kes)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-bold text-[#000000] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#295135]" /> Showroom Price:
                  </span>
                  <span className="text-2xl font-black font-mono-num text-[#000000]">
                    {formatKES(car.price_kes)}
                  </span>
                </div>
              )}
            </div>

            {/* Comparison Callout */}
            {comparison && comparison.saving_kes !== null && comparison.saving_kes > 0 && (
              <div className="p-4 rounded-xl bg-[#000000] text-white space-y-2 text-xs shadow-xs">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-[#6BD425]" />
                    Direct Import Savings
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#295135] text-[#6BD425] font-mono-num border border-[#6BD425]/30">
                    Save {comparison.saving_pct}%
                  </span>
                </div>
                <p className="text-white/80 leading-relaxed text-[11px]">
                  Similar {car.year} {car.make} {car.model} units average{' '}
                  <strong className="text-white font-mono-num">{formatKES(comparison.local.median_kes)}</strong> in Nairobi showrooms. Direct import saves approx{' '}
                  <strong className="text-[#6BD425] font-mono-num">{formatKES(comparison.saving_kes)}</strong> net!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`grid ${isImport && car.url ? 'grid-cols-1 sm:grid-cols-3' : isImport ? 'grid-cols-2' : car.url ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5 pt-1`}>
              <button
                onClick={handleCopyQuote}
                className="py-2.5 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#000000]/10 text-[#000000] font-semibold text-xs transition-colors border border-[#000000]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-[#000000]" /> : <Copy className="w-4 h-4 text-[#295135]" />}
                <span>{copied ? 'Copied!' : 'Copy Quote'}</span>
              </button>

              {isImport && (
                <button
                  onClick={() => openDutyModal(car)}
                  className="py-2.5 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#000000]/10 text-[#000000] font-semibold text-xs transition-colors border border-[#000000]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#000000]" />
                  <span>Duty Breakdown</span>
                </button>
              )}

              {car.url && (
                <a
                  href={car.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-[#000000] hover:bg-[#295135] text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#6BD425]" />
                  <span>Original Site</span>
                </a>
              )}
            </div>
          </div>

          {/* KRA Tax Schedule Breakdown Sheet — import listings only */}
          {isImport && breakdown && (
            <div className="p-5 rounded-2xl bg-white border border-[#000000]/15 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#000000]/10 pb-2">
                <h3 className="text-xs font-bold text-[#000000] uppercase tracking-wider font-display">
                  KRA Tax Itemization (2024 Schedule)
                </h3>
                <span className="text-[10px] text-[#295135] font-mono-num">1 USD = {breakdown.usd_kes_rate} KES</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#295135]">
                  <span>Customs Duty (25%):</span>
                  <span className="font-mono-num font-semibold text-[#000000]">{formatKES(breakdown.customs_duty_kes)}</span>
                </div>
                <div className="flex justify-between text-[#295135]">
                  <span>Excise Duty (20%):</span>
                  <span className="font-mono-num font-semibold text-[#000000]">{formatKES(breakdown.excise_duty_kes)}</span>
                </div>
                <div className="flex justify-between text-[#295135]">
                  <span>Value Added Tax (16%):</span>
                  <span className="font-mono-num font-semibold text-[#000000]">{formatKES(breakdown.vat_kes)}</span>
                </div>
                <div className="flex justify-between text-[#295135]">
                  <span>IDF & RDL Levies (5.5%):</span>
                  <span className="font-mono-num font-semibold text-[#000000]">{formatKES(breakdown.idf_levy_kes + breakdown.rdl_levy_kes)}</span>
                </div>
                <div className="flex justify-between text-[#295135]">
                  <span>Mombasa CFS & Port Charges:</span>
                  <span className="font-mono-num font-semibold text-[#000000]">{formatKES(breakdown.port_cfs_kes)}</span>
                </div>
                <div className="flex justify-between text-[#295135]">
                  <span>Clearing & NTSA Plates:</span>
                  <span className="font-mono-num font-semibold text-[#000000]">{formatKES(breakdown.clearing_agent_kes + breakdown.ntsa_inspection_kes + breakdown.number_plates_kes)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5-Stage Import Journey Roadmap — import listings only */}
      {isImport && (
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#000000]/15 shadow-2xs space-y-6">
        <div className="flex items-center gap-2.5">
          <Anchor className="w-5 h-5 text-[#000000]" />
          <div>
            <h3 className="text-lg font-bold text-[#000000] font-display">Step-by-Step Japan to Kenya Import Roadmap</h3>
            <p className="text-xs text-[#295135]">How your vehicle moves from auction yard in Japan to delivery in Nairobi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Purchase & De-Reg',
              desc: 'Exporter locks vehicle, clears Japanese export de-registration & title certificates.',
              duration: '3–5 Days',
            },
            {
              step: '02',
              title: 'QISJ Inspection',
              desc: 'Mandatory pre-shipment roadworthiness inspection in Yokohama or Nagoya.',
              duration: '2–4 Days',
            },
            {
              step: '03',
              title: 'Ocean RoRo Vessel',
              desc: 'Ship departs Japanese port destined for Port of Mombasa Kilindini Harbor.',
              duration: '24–28 Days',
            },
            {
              step: '04',
              title: 'KRA Customs Clearance',
              desc: 'Duty calculation via Simba System, IDF clearance, and CFS terminal release.',
              duration: '3–5 Days',
            },
            {
              step: '05',
              title: 'NTSA & Delivery',
              desc: 'Inspection sticker attached, number plates assigned, and transport to Nairobi.',
              duration: '1–2 Days',
            },
          ].map((s, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#000000] font-mono-num">STAGE {s.step}</span>
                <span className="text-[10px] text-[#295135] font-medium">{s.duration}</span>
              </div>
              <h4 className="font-bold text-[#000000] text-sm font-display">{s.title}</h4>
              <p className="text-xs text-[#295135] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
};

export default ListingDetail;
