import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';
import { ImportCostBreakdown, ComparisonResult } from '../types';
import { formatKES, formatUSD, getSourceBadgeInfo } from '../utils/formatters';
import {
  X,
  Calculator,
  ShieldCheck,
  Check,
  Copy,
  Printer,
  TrendingDown,
  Anchor,
  Sliders,
} from 'lucide-react';
import { motion } from 'motion/react';

export const DutyBreakdownModal: React.FC = () => {
  const { selectedCarForDutyModal, closeDutyModal, usdKesRate, showToast } = useApp();
  const [breakdown, setBreakdown] = useState<ImportCostBreakdown | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [customShipping, setCustomShipping] = useState<number | null>(null);
  const [customAgentFee, setCustomAgentFee] = useState<number>(40000);
  const [copied, setCopied] = useState(false);

  const car = selectedCarForDutyModal;
  const isImport = car ? car.source !== 'peachcars' : true;

  useEffect(() => {
    if (!car) {
      setBreakdown(null);
      setComparison(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const isImportListing = car.source !== 'peachcars';

        // Only compute KRA duty breakdown for import listings
        let est: ImportCostBreakdown | null = null;
        if (isImportListing) {
          const purchaseUsd = car.price_usd || (car.price_kes ? car.price_kes / usdKesRate : 5000);
          est = await apiClient.calculateImportCost({
            purchase_usd: purchaseUsd,
            body_type: car.body_type,
            shipping_usd: customShipping,
            clearing_agent_kes: customAgentFee,
          });
        }

        // Comparison data is useful for both local and import
        const comp = await apiClient.compareVehicles(car.make, car.model, car.year).catch(() => null);

        setBreakdown(est);
        setComparison(comp);
      } catch (err) {
        console.error('Failed to load duty estimate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [car, customShipping, customAgentFee, usdKesRate]);

  if (!car) return null;

  const badge = getSourceBadgeInfo(car.source);

  const handleCopy = () => {
    let text: string;

    if (isImport && breakdown) {
      text = `
🇰🇪 KRA VEHICLE IMPORT DUTY QUOTE (JapanEazy):
Vehicle: ${car.year} ${car.make} ${car.model} (${car.body_type?.toUpperCase()})
Auction / CIF Price: ${formatUSD(breakdown.purchase_usd)} (${formatKES(breakdown.purchase_usd * breakdown.usd_kes_rate)})
Freight & Marine Insurance: ${formatUSD(breakdown.shipping_usd + breakdown.insurance_usd)}
Total CIF Value: ${formatUSD(breakdown.cif_usd)} (${formatKES(breakdown.cif_kes)})

KRA DUTIES & TAXES:
• Customs Duty (25%): ${formatKES(breakdown.customs_duty_kes)}
• Excise Duty (20%): ${formatKES(breakdown.excise_duty_kes)}
• VAT (16%): ${formatKES(breakdown.vat_kes)}
• Import Declaration Fee (IDF 3.5%): ${formatKES(breakdown.idf_levy_kes)}
• Railway Development Levy (RDL 2.0%): ${formatKES(breakdown.rdl_levy_kes)}
-------------------------------------
TOTAL KRA TAX: ${formatKES(breakdown.tax_total_kes)}

PORT & CLEARING CHARGES:
• Port CFS & Terminal Handling: ${formatKES(breakdown.port_cfs_kes)}
• Clearing Agent Fee: ${formatKES(breakdown.clearing_agent_kes)}
• NTSA Inspection & Plates: ${formatKES(breakdown.ntsa_inspection_kes + breakdown.number_plates_kes)}
• 1-Yr Comprehensive Insurance: ${formatKES(breakdown.comprehensive_ins_kes)}

ESTIMATED TOTAL LANDED NAIROBI: ${formatKES(breakdown.total_import_kes)} (${formatUSD(breakdown.total_import_usd)})
FX Rate Applied: 1 USD = ${breakdown.usd_kes_rate} KES
      `.trim();
    } else {
      text = `
🇰🇪 KENYAN MARKET LISTING (JapanEazy):
Vehicle: ${car.year} ${car.make} ${car.model} (${car.body_type?.toUpperCase()})
Showroom Price: ${formatKES(car.price_kes || 0)}
Source: Kenyan Dealership Stock
      `.trim();
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Quote Copied', isImport ? 'Full KRA tax breakdown copied to clipboard' : 'Local listing price copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl bg-white border border-[#000000]/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#000000]/10 bg-[#FFFFFF] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#000000] flex items-center justify-center text-[#6BD425] shrink-0 shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                  {badge.label}
                </span>
                <span className="text-xs text-[#295135] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#000000]" />
                  Verified KRA 2026 Schedule
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#000000] mt-0.5 font-display">
                {car.year} {car.make} {car.model}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-white hover:bg-[#FFFFFF] text-stone-700 hover:text-black transition-colors border border-stone-200 shadow-2xs"
              title="Copy Quotation"
            >
              {copied ? <Check className="w-4 h-4 text-[#000000]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white hover:bg-[#FFFFFF] text-stone-700 hover:text-black transition-colors border border-stone-200 shadow-2xs hidden sm:flex"
              title="Print Calculation Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={closeDutyModal}
              className="p-2 rounded-xl bg-white hover:bg-[#FFFFFF] text-stone-500 hover:text-black transition-colors border border-stone-200 shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500 space-y-3">
              <div className="w-8 h-8 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-stone-700">
                {isImport ? 'Computing statutory taxes & port logistics...' : 'Loading listing details...'}
              </p>
            </div>
          ) : isImport && breakdown ? (
            <>
              {/* Grand Total Summary Card */}
              <div className="p-6 rounded-2xl bg-[#000000] text-white shadow-md relative overflow-hidden border border-[#295135]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-stone-300 font-bold">
                      Japan CIF Value
                    </span>
                    <div className="text-2xl font-bold font-mono-num text-white">
                      {formatUSD(breakdown.purchase_usd)}
                    </div>
                    <p className="text-xs text-stone-300">
                      ≈ {formatKES(breakdown.purchase_usd * breakdown.usd_kes_rate)}
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#295135] pt-4 md:pt-0 md:pl-6">
                    <span className="text-[11px] uppercase tracking-wider text-[#6BD425] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Total KRA Taxes
                    </span>
                    <div className="text-2xl font-bold font-mono-num text-white">
                      {formatKES(breakdown.tax_total_kes)}
                    </div>
                    <p className="text-xs text-stone-300">
                      Duty (25%) + Excise (20%) + VAT (16%)
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#295135] pt-4 md:pt-0 md:pl-6 bg-[#295135]/80 -m-3 p-4 rounded-xl border border-[#6BD425]/20">
                    <span className="text-[11px] uppercase tracking-wider text-[#6BD425] font-bold">
                      Estimated Landed Nairobi
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-white">
                      {formatKES(breakdown.total_import_kes)}
                    </div>
                    <p className="text-xs text-stone-200">
                      ≈ {formatUSD(breakdown.total_import_usd)} all-inclusive
                    </p>
                  </div>
                </div>

                {/* Comparison Savings Callout if available */}
                {comparison && comparison.saving_kes !== null && comparison.saving_kes > 0 && (
                  <div className="mt-5 pt-4 border-t border-[#295135] flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[#6BD425] font-semibold">
                      <TrendingDown className="w-4 h-4" />
                      <span>
                        Save <strong className="font-bold text-white">{formatKES(comparison.saving_kes)}</strong> ({comparison.saving_pct}%) vs Kenya showroom median ({formatKES(comparison.local.median_kes)})
                      </span>
                    </div>
                    <span className="text-stone-300 text-[11px]">Based on {comparison.local.count} verified Kenyan dealer listings</span>
                  </div>
                )}
              </div>

              {/* Waterfall & Tax Itemization */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: KRA Duties Breakdown */}
                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000] flex items-center gap-2 font-display">
                      <ShieldCheck className="w-4 h-4 text-[#000000]" />
                      Statutory KRA Tax Schedule
                    </h3>
                    <span className="text-xs text-[#295135] font-mono-num font-semibold">
                      CIF: {formatKES(breakdown.cif_kes)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Import Customs Duty (25%)</span>
                        <p className="text-[10px] text-stone-500">25% × Customs CIF Value</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.customs_duty_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Excise Duty (20%)</span>
                        <p className="text-[10px] text-stone-500">20% × (CIF + Customs Duty)</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.excise_duty_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Value Added Tax (16% VAT)</span>
                        <p className="text-[10px] text-stone-500">16% × (CIF + Customs + Excise)</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.vat_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Import Declaration Fee (IDF 3.5%)</span>
                        <p className="text-[10px] text-stone-500">3.5% × CIF (Min KES 5,000)</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.idf_levy_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Railway Development Levy (RDL 2.0%)</span>
                        <p className="text-[10px] text-stone-500">2.0% × CIF</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.rdl_levy_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[#000000] font-extrabold">
                      <span>Total Statutory Taxes</span>
                      <span className="font-mono-num text-sm text-[#000000]">{formatKES(breakdown.tax_total_kes)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Port, CFS & Local Clearing Fees */}
                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000] flex items-center gap-2 font-display">
                      <Anchor className="w-4 h-4 text-[#000000]" />
                      Port CFS & Local Registration
                    </h3>
                    <span className="text-xs text-stone-500 font-medium">Mombasa Port</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Ocean Freight (Japan to Mombasa)</span>
                        <p className="text-[10px] text-stone-500">RoRo shipping vessel</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatUSD(breakdown.shipping_usd)} ({formatKES(breakdown.shipping_usd * breakdown.usd_kes_rate)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Mombasa CFS & Port Charges</span>
                        <p className="text-[10px] text-stone-500">Terminal handling & port wharfage</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.port_cfs_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">Clearing Agent Commission</span>
                        <p className="text-[10px] text-stone-500">Customs documentation & release</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.clearing_agent_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">NTSA Registration & Number Plates</span>
                        <p className="text-[10px] text-stone-500">Inspection + Kenyan metal plates</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.ntsa_inspection_kes + breakdown.number_plates_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#000000]/8">
                      <div>
                        <span className="font-semibold text-[#000000]">1st Year Comprehensive Insurance</span>
                        <p className="text-[10px] text-stone-500">Estimated 3.5% of landed market value</p>
                      </div>
                      <span className="font-mono-num font-bold text-[#000000]">
                        {formatKES(breakdown.comprehensive_ins_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[#000000] font-extrabold">
                      <span>Total Clearing & Registration</span>
                      <span className="font-mono-num text-sm text-[#000000]">{formatKES(breakdown.charges_total_kes)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Fine-Tuning Slider Section */}
              <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#000000]">
                  <Sliders className="w-4 h-4 text-[#000000]" />
                  <span>Adjust Simulation Parameters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-stone-700 flex justify-between font-medium">
                      <span>Ocean Shipping (USD)</span>
                      <span className="font-mono-num text-[#000000] font-bold">${customShipping || breakdown.shipping_usd}</span>
                    </label>
                    <input
                      type="range"
                      min="800"
                      max="3500"
                      step="50"
                      value={customShipping || breakdown.shipping_usd}
                      onChange={(e) => setCustomShipping(Number(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#000000]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-700 flex justify-between font-medium">
                      <span>Clearing Agent Commission (KES)</span>
                      <span className="font-mono-num text-[#000000] font-bold">{formatKES(customAgentFee)}</span>
                    </label>
                    <input
                      type="range"
                      min="25000"
                      max="80000"
                      step="5000"
                      value={customAgentFee}
                      onChange={(e) => setCustomAgentFee(Number(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#000000]"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : !isImport ? (
            /* LOCAL LISTING: Show clean local market price summary — no CIF, no duties */
            <>
              <div className="p-6 rounded-2xl bg-[#000000] text-white shadow-md relative overflow-hidden border border-[#295135]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-stone-300 font-bold">
                      Listing Source
                    </span>
                    <div className="text-lg font-bold text-white">
                      Kenyan Dealership Stock
                    </div>
                    <p className="text-xs text-stone-300">
                      Vehicle is already in Kenya — no import duties apply
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#295135] pt-4 md:pt-0 md:pl-6 bg-[#295135]/80 -m-3 p-4 rounded-xl border border-[#6BD425]/20">
                    <span className="text-[11px] uppercase tracking-wider text-[#6BD425] font-bold">
                      Final Showroom Price
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-white">
                      {formatKES(car.price_kes || 0)}
                    </div>
                    <p className="text-xs text-stone-200">
                      As listed by the dealership
                    </p>
                  </div>
                </div>

                {/* Comparison context for local listing */}
                {comparison && comparison.import?.median_kes && comparison.saving_kes !== null && (
                  <div className="mt-5 pt-4 border-t border-[#295135] flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 text-stone-300 font-semibold">
                      <TrendingDown className="w-4 h-4 text-[#6BD425]" />
                      <span>
                        Direct import equivalent costs ~<strong className="text-white font-mono-num">{formatKES(comparison.import.median_kes)}</strong> landed
                        {comparison.saving_kes > 0 && (
                          <> — importing would save <strong className="text-[#6BD425] font-mono-num">{formatKES(comparison.saving_kes)}</strong></>  
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info card explaining no duties */}
              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000] flex items-center gap-2 font-display">
                  <ShieldCheck className="w-4 h-4 text-[#295135]" />
                  No Import Duties Applicable
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  This vehicle is listed by a Kenyan dealership and is already available locally. The displayed price of <strong className="text-[#000000] font-mono-num">{formatKES(car.price_kes || 0)}</strong> is the final asking price — no KRA customs duty, excise duty, VAT, or port clearing charges apply.
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#000000]/10 bg-[#FFFFFF] flex items-center justify-between gap-4 shrink-0">
          <p className="text-[11px] text-stone-500 hidden sm:block">
            *Exchange rate applied: 1 USD = {usdKesRate.toFixed(2)} KES. KRA assessment uses prevailing CBK rate.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={closeDutyModal}
              className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors border border-stone-200 shadow-2xs"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-[#000000] hover:bg-[#295135] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#6BD425]" /> : <Copy className="w-3.5 h-3.5 text-[#6BD425]" />}
              <span>{copied ? 'Copied!' : 'Copy Quote'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
