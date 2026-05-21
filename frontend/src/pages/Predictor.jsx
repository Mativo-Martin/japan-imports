import { useState } from "react";
import { usePredictWithImport } from "../hooks/useML";
import { useMakes, useModels }  from "../hooks/useListings";

const fmtUSD = (n) => n ? `$${Math.round(n).toLocaleString()}` : "—";
const fmtKES = (n) => n ? `KES ${Math.round(n).toLocaleString()}` : "—";

export default function Predictor() {
  const [form, setForm] = useState({
    make: "Toyota", model: "Vitz", year: 2021,
    mileage_km: 50000, engine_cc: 1000,
    fuel_type: "petrol", transmission: "automatic", body_type: "hatchback",
  });

  const { data: makes }  = useMakes();
  const { data: models } = useModels(form.make);
  const { mutate, data, isPending, isError, error } = usePredictWithImport();

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = (e) => { e.preventDefault(); mutate(form); };

  const inp = (label, key, type="text", opts={}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input type={type} value={form[key]} onChange={field(key)} {...opts}
        className="form-field" />
    </div>
  );

  return (
    <div className="predictor-page">
      <h1>Price predictor</h1>
      <p className="predictor-intro">
        ML model predicts Japan market price then calculates full KES landed cost.
      </p>

      <form onSubmit={submit} className="predictor-form">
        <div className="form-group">
          <label className="form-label">Make</label>
          <select value={form.make} onChange={field("make")} className="form-field">
            {makes?.map(m => <option key={m.make} value={m.make}>{m.make}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Model</label>
          <select value={form.model} onChange={field("model")} className="form-field">
            {models?.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
          </select>
        </div>
        {inp("Year", "year", "number", { min:2018, max:2026 })}
        {inp("Mileage (km)", "mileage_km", "number", { min:0 })}
        {inp("Engine cc", "engine_cc", "number", { min:500 })}
        <div className="form-group">
          <label className="form-label">Fuel</label>
          <select value={form.fuel_type} onChange={field("fuel_type")} className="form-field">
            {["petrol","diesel","hybrid","electric"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Transmission</label>
          <select value={form.transmission} onChange={field("transmission")} className="form-field">
            {["automatic","manual","cvt"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" disabled={isPending} className="btn btn-primary" style={{ width: "100%" }}>
            {isPending ? "Predicting…" : "Predict price"}
          </button>
        </div>
      </form>

      {isError && <div className="error-msg">{error.message}</div>}

      {data && (
        <div className="predictor-results">
          <div className="prediction-card prediction-japan">
            <div className="pred-label">Predicted Japan price</div>
            <div className="pred-value">
              {fmtUSD(data.summary.predicted_japan_usd)}
            </div>
            <div className="pred-detail">
              Range: {fmtUSD(data.prediction.confidence_low_usd)} – {fmtUSD(data.prediction.confidence_high_usd)}
            </div>
            <div className="pred-note">
              Model MAE: ±{fmtUSD(data.prediction.model_mae_usd)}
            </div>
          </div>
          <div className="prediction-card prediction-landed">
            <div className="pred-label">Total landed cost (Kenya)</div>
            <div className="pred-value">
              {fmtKES(data.summary.total_landed_kes)}
            </div>
            <div className="pred-detail">
              ≈ {fmtUSD(data.summary.total_landed_usd)} all-in
            </div>
            <div className="pred-note">
              Rate: 1 USD = KES {data.import_cost.usd_kes_rate?.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
