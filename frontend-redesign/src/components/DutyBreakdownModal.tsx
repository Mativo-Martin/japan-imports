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

  useEffect(() => {
    if (!car) {
      setBreakdown(null);
      setComparison(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const purchaseUsd = car.price_usd || (car.price_kes ? car.price_kes / usdKesRate : 5000);
        const [est, comp] = await Promise.all([
          apiClient.calculateImportCost({
            purchase_usd: purchaseUsd,
            body_type: car.body_type,
            shipping_usd: customShipping,
            clearing_agent_kes: customAgentFee,
          }),
          apiClient.compareVehicles(car.make, car.model, car.year).catch(() => null),
        ]);
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
    if (!breakdown) return;
    const text = `
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

    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Quote Copied', 'Full KRA tax breakdown copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-4xl bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 bg-stone-50/70 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0E402D] border border-[#0E402D] flex items-center justify-center text-[#9FCC2E] shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.bg}`}>
                  {badge.label}
                </span>
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0E402D]" />
                  KRA 2024 Schedule
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
              className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 shadow-2xs"
              title="Copy Quotation"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 shadow-2xs hidden sm:flex"
              title="Print Calculation Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={closeDutyModal}
              className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors border border-stone-200 shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500 space-y-3">
              <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Calculating exact KRA taxes and port charges...</p>
            </div>
          ) : breakdown ? (
            <>
              {/* Grand Total Summary Card */}
              <div className="p-6 rounded-2xl bg-stone-900 text-white shadow-md relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                      Japan Purchase (FOB/CIF)
                    </span>
                    <div className="text-2xl font-bold font-mono-num text-white">
                      {formatUSD(breakdown.purchase_usd)}
                    </div>
                    <p className="text-xs text-stone-400">
                      ≈ {formatKES(breakdown.purchase_usd * breakdown.usd_kes_rate)}
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-800 pt-4 md:pt-0 md:pl-6">
                    <span className="text-xs uppercase tracking-wider text-rose-300 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Total KRA Taxes
                    </span>
                    <div className="text-2xl font-bold font-mono-num text-rose-300">
                      {formatKES(breakdown.tax_total_kes)}
                    </div>
                    <p className="text-xs text-stone-400">
                      Duty (25%) + Excise (20%) + VAT (16%) + Levies
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-800 pt-4 md:pt-0 md:pl-6 bg-stone-800/80 -m-3 p-4 rounded-xl border border-stone-700">
                    <span className="text-xs uppercase tracking-wider text-stone-300 font-bold">
                      Estimated Landed (Nairobi)
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-white">
                      {formatKES(breakdown.total_import_kes)}
                    </div>
                    <p className="text-xs text-stone-300">
                      ≈ {formatUSD(breakdown.total_import_usd)} all-inclusive
                    </p>
                  </div>
                </div>

                {/* Comparison Savings Callout if available */}
                {comparison && comparison.saving_kes !== null && comparison.saving_kes > 0 && (
                  <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 text-rose-300 font-medium">
                      <TrendingDown className="w-4 h-4" />
                      <span>
                        Save <strong className="font-bold text-white">{formatKES(comparison.saving_kes)}</strong> ({comparison.saving_pct}%) compared to local Kenyan market median ({formatKES(comparison.local.median_kes)})
                      </span>
                    </div>
                    <span className="text-stone-400">Based on {comparison.local.count} verified Kenyan dealer listings</span>
                  </div>
                )}
              </div>

              {/* Waterfall & Tax Itemization */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: KRA Duties Breakdown */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
                      <ShieldCheck className="w-4 h-4 text-[#0E402D]" />
                      KRA Customs & Excise Tax Schedule
                    </h3>
                    <span className="text-xs text-stone-500 font-mono-num">
                      CIF: {formatKES(breakdown.cif_kes)}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Import Customs Duty (25%)</span>
                        <p className="text-[10px] text-stone-500">25% × Customs CIF Value</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.customs_duty_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Excise Duty (20%)</span>
                        <p className="text-[10px] text-stone-500">20% × (CIF + Customs Duty)</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.excise_duty_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Value Added Tax (16% VAT)</span>
                        <p className="text-[10px] text-stone-500">16% × (CIF + Customs + Excise)</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.vat_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Import Declaration Fee (IDF 3.5%)</span>
                        <p className="text-[10px] text-stone-500">3.5% × CIF (Min KES 5,000)</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.idf_levy_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Railway Development Levy (RDL 2.0%)</span>
                        <p className="text-[10px] text-stone-500">2.0% × CIF</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.rdl_levy_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-stone-900 font-bold">
                      <span>Total Statutory Taxes</span>
                      <span className="font-mono-num text-sm">{formatKES(breakdown.tax_total_kes)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Port, CFS & Local Clearing Fees */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
                      <Anchor className="w-4 h-4 text-[#0E402D]" />
                      Port CFS & Local Registration Charges
                    </h3>
                    <span className="text-xs text-stone-500">Port of Mombasa</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Ocean Freight (Japan to Mombasa)</span>
                        <p className="text-[10px] text-stone-500">RoRo shipping container rate</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatUSD(breakdown.shipping_usd)} ({formatKES(breakdown.shipping_usd * breakdown.usd_kes_rate)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Mombasa CFS & KPA Port Charges</span>
                        <p className="text-[10px] text-stone-500">Terminal handling & port wharfage</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.port_cfs_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">Clearing Agent Commission</span>
                        <p className="text-[10px] text-stone-500">Customs documentation & release</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.clearing_agent_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">NTSA Roadworthiness & Registration</span>
                        <p className="text-[10px] text-stone-500">Inspection + Kenyan number plates</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.ntsa_inspection_kes + breakdown.number_plates_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                      <div>
                        <span className="font-medium text-stone-800">1st Year Comprehensive Insurance</span>
                        <p className="text-[10px] text-stone-500">Estimated 3.5% of landed market value</p>
                      </div>
                      <span className="font-mono-num font-semibold text-stone-900">
                        {formatKES(breakdown.comprehensive_ins_kes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-stone-900 font-bold">
                      <span>Total Clearing & Registration</span>
                      <span className="font-mono-num text-sm">{formatKES(breakdown.charges_total_kes)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Fine-Tuning Slider Section */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <Sliders className="w-4 h-4 text-[#0E402D]" />
                  <span>Adjust Custom Scenario Parameters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-stone-600 flex justify-between">
                      <span>Ocean Shipping (USD)</span>
                      <span className="font-mono-num text-stone-900 font-semibold">${customShipping || breakdown.shipping_usd}</span>
                    </label>
                    <input
                      type="range"
                      min="800"
                      max="3500"
                      step="50"
                      value={customShipping || breakdown.shipping_usd}
                      onChange={(e) => setCustomShipping(Number(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#0E402D]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-600 flex justify-between">
                      <span>Clearing Agent Commission (KES)</span>
                      <span className="font-mono-num text-stone-900 font-semibold">{formatKES(customAgentFee)}</span>
                    </label>
                    <input
                      type="range"
                      min="25000"
                      max="80000"
                      step="5000"
                      value={customAgentFee}
                      onChange={(e) => setCustomAgentFee(Number(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#0E402D]"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/70 flex items-center justify-between gap-4 shrink-0">
          <p className="text-[11px] text-stone-500 hidden sm:block">
            *Exchange rate applied: 1 USD = {usdKesRate.toFixed(2)} KES. Actual KRA assessment uses prevailing weekly Central Bank rate.
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
              className="px-4 py-2 rounded-xl bg-[#0E402D] hover:bg-[#295135] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#9FCC2E]" /> : <Copy className="w-3.5 h-3.5 text-[#9FCC2E]" />}
              <span>{copied ? 'Copied!' : 'Copy Quote'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
