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
    <div>
      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[key]} onChange={field(key)} {...opts}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.5rem" }}>Price predictor</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: "1.5rem" }}>
        ML model predicts Japan market price then calculates full KES landed cost.
      </p>

      <form onSubmit={submit} style={{
        background: "#fff", border: "0.5px solid #e5e5e0", borderRadius: 12,
        padding: "1.25rem", display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: "1.5rem",
      }}>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Make</label>
          <select value={form.make} onChange={field("make")}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
            {makes?.map(m => <option key={m.make} value={m.make}>{m.make}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Model</label>
          <select value={form.model} onChange={field("model")}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
            {models?.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
          </select>
        </div>
        {inp("Year", "year", "number", { min:2018, max:2026 })}
        {inp("Mileage (km)", "mileage_km", "number", { min:0 })}
        {inp("Engine cc", "engine_cc", "number", { min:500 })}
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Fuel</label>
          <select value={form.fuel_type} onChange={field("fuel_type")}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
            {["petrol","diesel","hybrid","electric"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Transmission</label>
          <select value={form.transmission} onChange={field("transmission")}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
            {["automatic","manual","cvt"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" disabled={isPending} style={{
            width: "100%", background: "#1D9E75", color: "#fff",
            border: "none", borderRadius: 8, padding: "9px 0",
            cursor: "pointer", fontSize: 14, fontWeight: 500,
          }}>{isPending ? "Predicting…" : "Predict price"}</button>
        </div>
      </form>

      {isError && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12 }}>{error.message}</div>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#E1F5EE", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 12, color: "#0F6E56", marginBottom: 4 }}>Predicted Japan price</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#085041" }}>
              {fmtUSD(data.summary.predicted_japan_usd)}
            </div>
            <div style={{ fontSize: 12, color: "#0F6E56", marginTop: 4 }}>
              Range: {fmtUSD(data.prediction.confidence_low_usd)} – {fmtUSD(data.prediction.confidence_high_usd)}
            </div>
            <div style={{ fontSize: 11, color: "#1D9E75", marginTop: 2 }}>
              Model MAE: ±{fmtUSD(data.prediction.model_mae_usd)}
            </div>
          </div>
          <div style={{ background: "#FAEEDA", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 12, color: "#854F0B", marginBottom: 4 }}>Total landed cost (Kenya)</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#633806" }}>
              {fmtKES(data.summary.total_landed_kes)}
            </div>
            <div style={{ fontSize: 12, color: "#854F0B", marginTop: 4 }}>
              ≈ {fmtUSD(data.summary.total_landed_usd)} all-in
            </div>
            <div style={{ fontSize: 11, color: "#854F0B", marginTop: 2 }}>
              Rate: 1 USD = KES {data.import_cost.usd_kes_rate?.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
