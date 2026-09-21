import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { useVehicleDropdowns } from '../hooks/useVehicleDropdowns';
import { MLPrediction } from '../types';
import { formatKES, formatUSD } from '../utils/formatters';
import { Sparkles, TrendingDown, Sliders } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Predictor: React.FC = () => {
  const { usdKesRate, showToast } = useApp();
  const { makesList, modelsList, selectedMake: make, setSelectedMake: setMake, selectedModel: model, setSelectedModel: setModel } = useVehicleDropdowns('Toyota', 'Harrier');

  const [year, setYear] = useState(2021);
  const [mileage, setMileage] = useState(48000);
  const [engineCc, setEngineCc] = useState(2000);
  const [fuelType, setFuelType] = useState('petrol');
  const [transmission, setTransmission] = useState('automatic');
  const [driveType, setDriveType] = useState('2wd');
  const [condition, setCondition] = useState(4.5);

  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  // Load makes on mount
  const runPrediction = async () => {
    if (!make || !model) return;
    setLoading(true);
    try {
      const res = await apiClient.predictPrice({
        make, model, year, mileage_km: mileage, engine_cc: engineCc,
        fuel_type: fuelType, transmission, drive_type: driveType, condition_score: condition,
      });
      setPrediction(res);
      showToast('Valuation Computed', `Estimated Japan CIF: ${formatUSD(res?.predicted_price_usd || 0)}`, 'success');
    } catch (err) {
      console.error('Failed to predict price:', err);
      showToast('Error', 'Unable to compute valuation', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (make && model) runPrediction();
  }, [make, model]);

  // const runPrediction = async () => {
  //   if (!make || !model) return;
  //   setLoading(true);
  //   try {
  //     const res = await apiClient.predictPrice({
  //       make,
  //       model,
  //       year,
  //       mileage_km: mileage,
  //       engine_cc: engineCc,
  //       fuel_type: fuelType,
  //       transmission,
  //       drive_type: driveType,
  //       condition_score: condition,
  //     });
  //     setPrediction(res);
  //     showToast('Valuation Computed', `Estimated Japan CIF: ${formatUSD(res?.predicted_price_usd || 0)}`, 'success');
  //   } catch (err) {
  //     console.error('Failed to predict price:', err);
  //     showToast('Error', 'Unable to compute valuation', 'warning');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Run initial prediction once make/model are populated
  useEffect(() => {
    if (make && model) {
      runPrediction();
    }
  }, [make, model]);

  // Safe fallback metrics
  const confidenceScore = prediction
    ? (prediction as any).confidence_score ?? (prediction.confidence === 'high' ? 0.92 : prediction.confidence === 'medium' ? 0.85 : 0.75)
    : 0.85;
  const predictedUsd = prediction?.predicted_price_usd ?? 0;
  const lowUsd = prediction
    ? prediction.confidence_low_usd ?? (prediction as any).price_range_low_usd ?? Math.round(predictedUsd * 0.9)
    : 0;
  const highUsd = prediction
    ? prediction.confidence_high_usd ?? (prediction as any).price_range_high_usd ?? Math.round(predictedUsd * 1.1)
    : 0;
  const activeRate = (prediction as any)?.usd_kes_rate ?? usdKesRate;

  // Compute 3-year depreciation trajectory
  const baseLanded = prediction ? predictedUsd * activeRate * 1.78 + 95000 : 0;
  const depreciationCurve = prediction
    ? [
        { year: 'Current', value: Math.round(baseLanded) },
        { year: 'Year 1', value: Math.round(baseLanded * 0.88) },
        { year: 'Year 2', value: Math.round(baseLanded * 0.78) },
        { year: 'Year 3', value: Math.round(baseLanded * 0.70) },
        { year: 'Year 4', value: Math.round(baseLanded * 0.62) },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300 text-stone-800 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#9E2A2B]" />
          <span>Machine Learning Car Price & Residual Valuation Model</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-display">
          AI Fair Value & Depreciation Predictor
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Trained on historical auction sales, mileage depreciation vectors, and Kenyan market resale values.
        </p>
      </div>

      {/* Main Grid: Inputs vs Prediction Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Parameters Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Sliders className="w-4 h-4 text-[#9E2A2B]" />
              <span>Target Vehicle Parameters</span>
            </h3>

            {/* Make & Model */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Vehicle Make</label>
                <select
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  {makesList.map((m) => (
                    <option key={m.make} value={m.make}>{m.make}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Model Name</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  {modelsList.map((modelName) => (
                    <option key={modelName} value={modelName}>{modelName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year & Mileage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex justify-between">
                  <span>Year of Reg</span>
                  <span className="text-[10px] text-stone-500">{year}</span>
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono-num focus:outline-none focus:border-stone-400"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex justify-between">
                  <span>Mileage (km)</span>
                  <span className="font-mono-num text-stone-500">{mileage.toLocaleString()} km</span>
                </label>
                <input
                  type="number"
                  step="5000"
                  value={mileage}
                  onChange={(e) => setMileage(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono-num focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            {/* Engine CC & Condition Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Engine CC</label>
                <input
                  type="number"
                  step="100"
                  value={engineCc}
                  onChange={(e) => setEngineCc(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono-num focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex justify-between">
                  <span>Auction Condition</span>
                  <span className="font-bold text-[#9E2A2B]">{condition} / 5</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value={5.0}>5.0 - Pristine (Like New)</option>
                  <option value={4.5}>4.5 - Excellent Condition</option>
                  <option value={4.0}>4.0 - Good Clean Condition</option>
                  <option value={3.5}>3.5 - Fair (Minor Wear)</option>
                  <option value={3.0}>3.0 - Moderate Wear</option>
                </select>
              </div>
            </div>

            {/* Fuel & Drivetrain */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Fuel</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="petrol">Petrol</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Drivetrain</label>
                <select
                  value={driveType}
                  onChange={(e) => setDriveType(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="2wd">2WD (FWD/RWD)</option>
                  <option value="4wd">4WD / AWD</option>
                </select>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={runPrediction}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#9E2A2B] hover:bg-[#852324] text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'Evaluating Model...' : 'Calculate Fair AI Valuation'}</span>
            </button>
          </div>
        </div>

        {/* Prediction Results & Depreciation Visualizer */}
        <div className="lg:col-span-7 space-y-6">
          {prediction && (
            <>
              {/* Fair Value Hero Card */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200">
                      Model {(prediction as any).model_version || 'LightGBM v1.4'}
                    </span>
                    <span className="text-xs text-stone-500">Confidence: {(confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-xs text-stone-500 font-mono-num">
                    1 USD = {activeRate} KES
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div>
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                      Predicted Japan CIF Value
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono-num text-stone-900 mt-1">
                      {formatUSD(predictedUsd)}
                    </div>
                    <p className="text-xs text-stone-500 mt-1 font-mono-num">
                      Range: {formatUSD(lowUsd)} – {formatUSD(highUsd)}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                    <span className="text-xs font-bold text-stone-600 uppercase tracking-wider block">
                      Estimated Landed in Kenya
                    </span>
                    <div className="text-2xl sm:text-3xl font-black font-mono-num text-[#9E2A2B]">
                      {formatKES(predictedUsd * activeRate * 1.78 + 95000)}
                    </div>
                    <p className="text-xs text-stone-500">
                      Includes 25% Duty, 20% Excise, 16% VAT, and CFS fees
                    </p>
                  </div>
                </div>
              </div>

              {/* Depreciation Trajectory Curve */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-[#9E2A2B]" />
                    <h3 className="text-base font-bold text-stone-900 font-display">Projected Kenyan Resale Value Curve</h3>
                  </div>
                  <span className="text-xs text-stone-500">4-Year Depreciation Horizon</span>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={depreciationCurve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="deprecColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9E2A2B" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#9E2A2B" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="year" stroke="#78716c" fontSize={11} />
                      <YAxis
                        stroke="#78716c"
                        fontSize={11}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(val: any) => formatKES(Number(val))}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e7e5e4',
                          borderRadius: '0.75rem',
                          color: '#1c1917',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#9E2A2B"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#deprecColor)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Predictor;