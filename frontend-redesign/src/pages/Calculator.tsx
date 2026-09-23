import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { ImportCostBreakdown } from '../types';
import { formatKES, formatUSD } from '../utils/formatters';
import {
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Sliders,
  Sparkles,
  PieChart as PieIcon,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export const Calculator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { usdKesRate, showToast } = useApp();

  const initUsd = searchParams.get('usd') ? parseFloat(searchParams.get('usd')!) : 8500;
  const initBody = searchParams.get('body') || 'suv';

  const [purchaseUsd, setPurchaseUsd] = useState<number>(initUsd);
  const [bodyType, setBodyType] = useState<string>(initBody);
  const [shippingUsd, setShippingUsd] = useState<number | null>(null);
  const [clearingAgentKes, setClearingAgentKes] = useState<number>(40000);
  const [breakdown, setBreakdown] = useState<ImportCostBreakdown | null>(null);
  const [, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Preset models
  const PRESETS = [
    { label: 'Toyota Vitz (Hatchback)', usd: 3850, body: 'hatchback' },
    { label: 'Nissan Note e-POWER', usd: 4400, body: 'hatchback' },
    { label: 'Toyota Premio (Sedan)', usd: 8200, body: 'sedan' },
    { label: 'Mazda CX-5 (SUV)', usd: 12800, body: 'suv' },
    { label: 'Subaru Forester (SUV)', usd: 11500, body: 'suv' },
    { label: 'Toyota Harrier (SUV)', usd: 15400, body: 'suv' },
    { label: 'Toyota Prado TX (SUV)', usd: 27500, body: 'suv' },
  ];

  useEffect(() => {
    const calculate = async () => {
      if (!purchaseUsd || purchaseUsd <= 0) return;
      setLoading(true);
      try {
        const res = await apiClient.calculateImportCost({
          purchase_usd: purchaseUsd,
          body_type: bodyType,
          shipping_usd: shippingUsd,
          clearing_agent_kes: clearingAgentKes,
        });
        setBreakdown(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(calculate, 200);
    return () => clearTimeout(timer);
  }, [purchaseUsd, bodyType, shippingUsd, clearingAgentKes, usdKesRate]);

  const handleCopy = () => {
    if (!breakdown) return;
    const text = `
JAPANEAZY - VEHICLE IMPORT DUTY REPORT
CIF Purchase Value: ${formatUSD(breakdown.cif_usd)} (${formatKES(breakdown.cif_kes)})
• Customs Duty (25%): ${formatKES(breakdown.customs_duty_kes)}
• Excise Duty (20%): ${formatKES(breakdown.excise_duty_kes)}
• Value Added Tax (16% VAT): ${formatKES(breakdown.vat_kes)}
• IDF (3.5%) & RDL (2.0%): ${formatKES(breakdown.idf_levy_kes + breakdown.rdl_levy_kes)}
---------------------------------------------
TOTAL KRA TAXES: ${formatKES(breakdown.tax_total_kes)}
PORT & REGISTRATION: ${formatKES(breakdown.charges_total_kes)}
ESTIMATED TOTAL LANDED NAIROBI: ${formatKES(breakdown.total_import_kes)} (${formatUSD(breakdown.total_import_usd)})
FX Reference: 1 USD = ${breakdown.usd_kes_rate} KES
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Duty Calculation Copied', 'Full tax statement copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const chartData = breakdown
    ? [
      { name: 'CIF Purchase (Japan)', value: breakdown.cif_kes, color: '#000000' },
      { name: 'Customs Duty (25%)', value: breakdown.customs_duty_kes, color: '#000000' },
      { name: 'Excise Duty (20%)', value: breakdown.excise_duty_kes, color: '#295135' },
      { name: 'VAT (16%)', value: breakdown.vat_kes, color: '#447251' },
      { name: 'IDF & RDL Levies', value: breakdown.idf_levy_kes + breakdown.rdl_levy_kes, color: '#6BD425' },
      { name: 'Port & Clearing Fees', value: breakdown.charges_total_kes, color: '#8FA382' },
    ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#000000]/10 border border-[#000000]/20 text-[#000000] text-xs font-bold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#000000]" />
            <span>KRA Customs Tariff Schedule 2026</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#000000] tracking-tight font-display">
            KRA Import Duty & Landed Cost Simulator
          </h1>
          <p className="text-xs text-stone-500">
            Calculate exact statutory taxes, ocean freight, Mombasa CFS wharfage, and registration fees
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!breakdown}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#000000]/15 text-xs font-bold text-[#000000] shadow-2xs transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-[#000000]" /> : <Copy className="w-4 h-4 text-[#000000]" />}
            <span>{copied ? 'Copied' : 'Copy Quote'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl bg-[#000000] hover:bg-[#295135] text-white text-xs font-bold shadow-2xs transition-colors hidden sm:flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#6BD425]" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-[#295135] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#000000]" />
          <span>Vehicle Presets:</span>
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPurchaseUsd(preset.usd);
                setBodyType(preset.body);
              }}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFFFFF] border border-[#000000]/12 text-xs font-bold text-stone-800 transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              <span>{preset.label}</span>
              <span className="font-mono-num text-[#000000] font-extrabold">${preset.usd.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Parameters Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#000000] uppercase tracking-wider flex items-center gap-2 font-display">
              <Sliders className="w-4 h-4 text-[#000000]" />
              <span>Valuation Parameters</span>
            </h3>

            {/* Purchase Price Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#000000] flex justify-between">
                <span>Auction FOB / CIF Price (USD)</span>
                <span className="font-mono-num text-[#000000] font-extrabold">
                  {formatUSD(purchaseUsd)} (≈ {formatKES(purchaseUsd * usdKesRate)})
                </span>
              </label>
              <input
                type="number"
                min="1000"
                max="150000"
                step="250"
                value={purchaseUsd}
                onChange={(e) => setPurchaseUsd(Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-3.5 py-2 text-sm text-[#000000] font-mono-num font-bold focus:outline-none focus:border-[#000000]"
              />
              <input
                type="range"
                min="2000"
                max="50000"
                step="500"
                value={purchaseUsd}
                onChange={(e) => setPurchaseUsd(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#000000]"
              />
            </div>

            {/* Body Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#000000]">Body Type (Sets Ocean Freight)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'hatchback', label: 'Hatchback', freight: '$1,400' },
                  { id: 'sedan', label: 'Sedan', freight: '$1,600' },
                  { id: 'suv', label: 'SUV', freight: '$1,900' },
                  { id: 'wagon', label: 'Wagon', freight: '$1,650' },
                  { id: 'minivan', label: 'Minivan', freight: '$2,000' },
                  { id: 'pickup', label: 'Pickup', freight: '$2,200' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBodyType(b.id)}
                    className={`p-2 rounded-xl text-left transition-all text-xs font-bold ${bodyType === b.id
                      ? 'bg-[#000000] text-[#6BD425] shadow-xs'
                      : 'bg-[#FFFFFF] text-stone-700 border border-[#000000]/8 hover:bg-stone-200'
                      }`}
                  >
                    <span className="block capitalize">{b.label}</span>
                    <span className={`text-[10px] ${bodyType === b.id ? 'text-stone-200' : 'text-stone-500'}`}>Freight: {b.freight}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Freight Override */}
            <div className="space-y-1.5 pt-2 border-t border-stone-100">
              <label className="text-xs font-bold text-[#000000] flex justify-between">
                <span>Ocean Freight Rate (USD)</span>
                <span className="font-mono-num text-stone-600 font-semibold">${shippingUsd || (bodyType === 'suv' ? 1900 : 1600)}</span>
              </label>
              <input
                type="number"
                min="500"
                max="5000"
                step="50"
                placeholder="Default based on body type"
                value={shippingUsd || ''}
                onChange={(e) => setShippingUsd(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-[#FFFFFF] border border-[#000000]/10 rounded-xl px-3 py-1.5 text-xs text-[#000000] font-mono-num font-semibold focus:outline-none focus:border-[#000000]"
              />
            </div>

            {/* Clearing Agent Fee Slider */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#000000] flex justify-between">
                <span>Clearing Agent Commission (KES)</span>
                <span className="font-mono-num font-bold text-[#000000]">{formatKES(clearingAgentKes)}</span>
              </label>
              <input
                type="range"
                min="25000"
                max="75000"
                step="2500"
                value={clearingAgentKes}
                onChange={(e) => setClearingAgentKes(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#000000]"
              />
            </div>
          </div>

          {/* KRA Tax Formula Reference Card */}
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#000000]/10 text-xs text-stone-600 space-y-1.5 shadow-2xs">
            <h4 className="font-bold text-[#000000] flex items-center gap-1.5 font-display">
              <HelpCircle className="w-3.5 h-3.5 text-[#000000]" />
              KRA Compound Tax Formula
            </h4>
            <p className="leading-relaxed text-[11px] text-stone-600">
              <strong>Customs Duty (25%)</strong> is levied on Customs CIF. <strong>Excise Duty (20%)</strong> applies to (CIF + Customs). <strong>VAT (16%)</strong> applies to (CIF + Customs + Excise). IDF (3.5%) and RDL (2.0%) apply directly to CIF.
            </p>
          </div>
        </div>

        {/* Right: Results, Waterfall Breakdown & Donut Chart */}
        <div className="lg:col-span-7 space-y-4">
          {breakdown && (
            <>
              {/* Grand Total Highlights */}
              <div className="p-5 rounded-2xl bg-[#000000] text-white shadow-md space-y-3.5 border border-[#295135]">
                <div className="flex items-center justify-between border-b border-[#295135] pb-2.5">
                  <span className="text-[11px] uppercase font-bold text-[#6BD425] tracking-wider">
                    Total Landed Cost in Nairobi (All-Inclusive)
                  </span>
                  <span className="text-xs font-mono-num text-stone-300">
                    FX: 1 USD = {breakdown.usd_kes_rate} KES
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="text-2xl sm:text-4xl font-black font-mono-num text-white">
                    {formatKES(breakdown.total_import_kes)}
                  </div>
                  <div className="text-sm font-bold font-mono-num text-[#6BD425]">
                    ≈ {formatUSD(breakdown.total_import_usd)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-[#295135] text-xs">
                  <div>
                    <span className="text-stone-300 block text-[10px] font-bold">CIF Value (USD)</span>
                    <span className="font-bold text-white font-mono-num">{formatUSD(breakdown.cif_usd)}</span>
                  </div>
                  <div>
                    <span className="text-[#6BD425] block text-[10px] font-bold">Total KRA Tax</span>
                    <span className="font-bold text-white font-mono-num">{formatKES(breakdown.tax_total_kes)}</span>
                  </div>
                  <div>
                    <span className="text-stone-300 block text-[10px] font-bold">Port & Clearing</span>
                    <span className="font-bold text-white font-mono-num">{formatKES(breakdown.charges_total_kes)}</span>
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Donut Chart */}
              <div className="p-5 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#000000] uppercase tracking-wider flex items-center gap-2 font-display">
                  <PieIcon className="w-4 h-4 text-[#000000]" />
                  Cost Component Distribution (KES)
                </h3>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatKES(Number(value))}
                        contentStyle={{
                          backgroundColor: '#000000',
                          borderColor: '#295135',
                          borderRadius: '0.75rem',
                          color: '#ffffff',
                          fontSize: '11px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '10px', color: '#000000' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line-by-Line Itemized Table */}
              <div className="p-4 rounded-2xl bg-white border border-[#000000]/10 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-[#000000] uppercase tracking-wider font-display">
                  Itemized Customs & Port Clearing Schedule
                </h3>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Vehicle Auction / FOB Purchase Price</span>
                    <span className="font-mono-num font-bold text-[#000000]">{formatKES(breakdown.purchase_usd * breakdown.usd_kes_rate)} ({formatUSD(breakdown.purchase_usd)})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Ocean Freight & Marine Insurance</span>
                    <span className="font-mono-num font-bold text-[#000000]">{formatKES((breakdown.shipping_usd + breakdown.insurance_usd) * breakdown.usd_kes_rate)} ({formatUSD(breakdown.shipping_usd + breakdown.insurance_usd)})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100 text-[#000000] font-bold bg-[#FFFFFF] px-2 rounded-lg">
                    <span>Total Customs CIF Mombasa</span>
                    <span className="font-mono-num text-[#000000]">{formatKES(breakdown.cif_kes)} ({formatUSD(breakdown.cif_usd)})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Import Customs Duty (25%)</span>
                    <span className="font-mono-num font-bold text-[#000000]">{formatKES(breakdown.customs_duty_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Excise Duty (20%)</span>
                    <span className="font-mono-num font-bold text-[#000000]">{formatKES(breakdown.excise_duty_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Value Added Tax (16% VAT)</span>
                    <span className="font-mono-num font-bold text-[#000000]">{formatKES(breakdown.vat_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Import Declaration Fee (IDF 3.5%)</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.idf_levy_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Railway Development Levy (RDL 2.0%)</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.rdl_levy_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Mombasa Port Wharfage & CFS Handling</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.port_cfs_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">Clearing Agent Commission</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.clearing_agent_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-600">NTSA Roadworthiness & Number Plates</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.ntsa_inspection_kes + breakdown.number_plates_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-600">1st Year Comprehensive Insurance</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.comprehensive_ins_kes)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
