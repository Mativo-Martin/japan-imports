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
        { name: 'CIF Purchase (Japan)', value: breakdown.cif_kes, color: '#1C1917' },
        { name: 'Customs Duty (25%)', value: breakdown.customs_duty_kes, color: '#9E2A2B' },
        { name: 'Excise Duty (20%)', value: breakdown.excise_duty_kes, color: '#C25E00' },
        { name: 'VAT (16%)', value: breakdown.vat_kes, color: '#4B5563' },
        { name: 'IDF & RDL Levies', value: breakdown.idf_levy_kes + breakdown.rdl_levy_kes, color: '#6B7280' },
        { name: 'Port & Clearing Fees', value: breakdown.charges_total_kes, color: '#9CA3AF' },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300 text-stone-800 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#9E2A2B]" />
            <span>KRA Customs Schedule 2024 (East African Community EAC Tariff)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-display">
            KRA Import Duty & Landed Cost Simulator
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Compute the exact compound tax structure, port CFS fees, and comprehensive registration for any vehicle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!breakdown}
            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 shadow-2xs transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-[#9E2A2B]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Quote'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-2xs transition-colors hidden sm:flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#9E2A2B]" />
          <span>Quick Vehicle Presets:</span>
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPurchaseUsd(preset.usd);
                setBodyType(preset.body);
              }}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              <span>{preset.label}</span>
              <span className="font-mono-num text-[#9E2A2B] font-bold">${preset.usd.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Parameters Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-5">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Sliders className="w-4 h-4 text-[#9E2A2B]" />
              <span>Input Valuation Variables</span>
            </h3>

            {/* Purchase Price Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 flex justify-between">
                <span>Vehicle FOB / Auction Price (USD)</span>
                <span className="font-mono-num text-stone-900 font-bold">
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
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 font-mono-num focus:outline-none focus:border-stone-400"
              />
              <input
                type="range"
                min="2000"
                max="50000"
                step="500"
                value={purchaseUsd}
                onChange={(e) => setPurchaseUsd(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#9E2A2B]"
              />
            </div>

            {/* Body Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700">Body Category (Sets Ocean Freight)</label>
              <div className="grid grid-cols-3 gap-2">
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
                    className={`p-2 rounded-xl text-left transition-all text-xs ${
                      bodyType === b.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-50 text-stone-600 border border-stone-200/70 hover:bg-stone-100'
                    }`}
                  >
                    <span className="font-bold block capitalize">{b.label}</span>
                    <span className={`text-[10px] ${bodyType === b.id ? 'text-stone-300' : 'text-stone-400'}`}>Freight: {b.freight}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Freight Override */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-semibold text-stone-700 flex justify-between">
                <span>Ocean Freight Rate (USD)</span>
                <span className="font-mono-num text-stone-500">${shippingUsd || (bodyType === 'suv' ? 1900 : 1600)}</span>
              </label>
              <input
                type="number"
                min="500"
                max="5000"
                step="50"
                placeholder="Default based on body type"
                value={shippingUsd || ''}
                onChange={(e) => setShippingUsd(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono-num focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* Clearing Agent Fee Slider */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 flex justify-between">
                <span>Clearing Agent Commission (KES)</span>
                <span className="font-mono-num font-semibold text-stone-900">{formatKES(clearingAgentKes)}</span>
              </label>
              <input
                type="range"
                min="25000"
                max="75000"
                step="2500"
                value={clearingAgentKes}
                onChange={(e) => setClearingAgentKes(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-700"
              />
            </div>
          </div>

          {/* KRA Tax Formula Reference Card */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 text-xs text-stone-600 space-y-2 shadow-2xs">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5 font-display">
              <HelpCircle className="w-3.5 h-3.5 text-[#9E2A2B]" />
              How Compound KRA Taxes Work
            </h4>
            <p className="leading-relaxed text-[11px] text-stone-500">
              <strong>Customs Duty (25%)</strong> is levied on Customs CIF. <strong>Excise Duty (20%)</strong> applies to (CIF + Customs). <strong>VAT (16%)</strong> applies to (CIF + Customs + Excise). IDF (3.5%) and RDL (2.0%) are calculated directly on CIF.
            </p>
          </div>
        </div>

        {/* Right: Results, Waterfall Breakdown & Donut Chart */}
        <div className="lg:col-span-7 space-y-6">
          {breakdown && (
            <>
              {/* Grand Total Highlights */}
              <div className="p-6 rounded-2xl bg-stone-900 text-white shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <span className="text-xs uppercase font-bold text-stone-300 tracking-wider">
                    Total Landed Cost in Nairobi (All-Inclusive)
                  </span>
                  <span className="text-xs font-mono-num text-stone-400">
                    FX: 1 USD = {breakdown.usd_kes_rate} KES
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono-num text-white">
                    {formatKES(breakdown.total_import_kes)}
                  </div>
                  <div className="text-sm font-semibold font-mono-num text-stone-400">
                    ≈ {formatUSD(breakdown.total_import_usd)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-stone-800 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px]">CIF Value (USD)</span>
                    <span className="font-bold text-white font-mono-num">{formatUSD(breakdown.cif_usd)}</span>
                  </div>
                  <div>
                    <span className="text-rose-300 block text-[10px]">Total KRA Tax</span>
                    <span className="font-bold text-rose-200 font-mono-num">{formatKES(breakdown.tax_total_kes)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Port & Clearing</span>
                    <span className="font-bold text-stone-200 font-mono-num">{formatKES(breakdown.charges_total_kes)}</span>
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Donut Chart */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2 font-display">
                  <PieIcon className="w-4 h-4 text-[#9E2A2B]" />
                  Cost Component Distribution (KES)
                </h3>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatKES(Number(value))}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e7e5e4',
                          borderRadius: '0.75rem',
                          color: '#1c1917',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '11px', color: '#57534e' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line-by-Line Itemized Table */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-display">
                  Full KRA Customs Schedule Statement
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Vehicle Auction / FOB Purchase Price</span>
                    <span className="font-mono-num font-semibold text-stone-900">{formatKES(breakdown.purchase_usd * breakdown.usd_kes_rate)} ({formatUSD(breakdown.purchase_usd)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Ocean Freight & Marine Insurance</span>
                    <span className="font-mono-num font-semibold text-stone-900">{formatKES((breakdown.shipping_usd + breakdown.insurance_usd) * breakdown.usd_kes_rate)} ({formatUSD(breakdown.shipping_usd + breakdown.insurance_usd)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100 text-stone-900 font-semibold bg-stone-50 px-2 rounded-lg">
                    <span>Total Customs CIF Mombasa</span>
                    <span className="font-mono-num">{formatKES(breakdown.cif_kes)} ({formatUSD(breakdown.cif_usd)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Import Customs Duty (25%)</span>
                    <span className="font-mono-num font-semibold text-[#9E2A2B]">{formatKES(breakdown.customs_duty_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Excise Duty (20%)</span>
                    <span className="font-mono-num font-semibold text-[#9E2A2B]">{formatKES(breakdown.excise_duty_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Value Added Tax (16% VAT)</span>
                    <span className="font-mono-num font-semibold text-[#9E2A2B]">{formatKES(breakdown.vat_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Import Declaration Fee (IDF 3.5%)</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.idf_levy_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Railway Development Levy (RDL 2.0%)</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.rdl_levy_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Mombasa Port Wharfage & CFS Handling</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.port_cfs_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">Clearing Agent Documentation Commission</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.clearing_agent_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-600">NTSA Roadworthiness & Kenyan Number Plates</span>
                    <span className="font-mono-num font-semibold text-stone-700">{formatKES(breakdown.ntsa_inspection_kes + breakdown.number_plates_kes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
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
