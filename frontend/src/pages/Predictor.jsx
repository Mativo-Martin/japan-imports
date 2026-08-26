import { useState } from "react";
import { usePredictWithImport } from "../hooks/useML";
import { useMakes, useModels }  from "../hooks/useListings";

const fmtUSD = (n) => n ? `$${Math.round(n).toLocaleString()}` : "—";
const fmtKES = (n) => n ? `KES ${Math.round(n).toLocaleString()}` : "—";

const FUELS = ["petrol", "diesel", "hybrid", "electric"];
const TRANSMISSIONS = ["automatic", "manual", "cvt"];

export default function Predictor() {
  const [form, setForm] = useState({
    make: "Toyota", model: "Vitz", year: 2021,
    mileage_km: 50000, engine_cc: 1000,
    fuel_type: "petrol", transmission: "automatic", body_type: "hatchback",
  });

  const { data: makes }  = useMakes();
  const { data: models } = useModels(form.make);
  const { mutate, data, isPending, isError, error } = usePredictWithImport();

  const field  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = (e) => { e.preventDefault(); mutate(form); };

  return (
    <div className="predictor-page">
      <h1>Price predictor</h1>
      <p className="predictor-intro">
        ML model predicts Japan market price then calculates full KES landed cost.
      </p>

      <form onSubmit={submit} className="predictor-form" aria-label="Price prediction inputs">
        {/* Make */}
        <div className="form-field">
          <label htmlFor="pred-make">Make</label>
          <select id="pred-make" value={form.make} onChange={field("make")}>
            {makes?.map(m => <option key={m.make} value={m.make}>{m.make}</option>)}
          </select>
        </div>

        {/* Model */}
        <div className="form-field">
          <label htmlFor="pred-model">Model</label>
          <select id="pred-model" value={form.model} onChange={field("model")}>
            {models?.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
          </select>
        </div>

        {/* Year */}
        <div className="form-field">
          <label htmlFor="pred-year">Year</label>
          <input
            id="pred-year"
            type="number"
            value={form.year}
            onChange={field("year")}
            min={2018}
            max={2026}
          />
        </div>

        {/* Mileage */}
        <div className="form-field">
          <label htmlFor="pred-mileage">Mileage (km)</label>
          <input
            id="pred-mileage"
            type="number"
            value={form.mileage_km}
            onChange={field("mileage_km")}
            min={0}
          />
        </div>

        {/* Engine */}
        <div className="form-field">
          <label htmlFor="pred-engine">Engine (cc)</label>
          <input
            id="pred-engine"
            type="number"
            value={form.engine_cc}
            onChange={field("engine_cc")}
            min={500}
          />
        </div>

        {/* Fuel */}
        <div className="form-field">
          <label htmlFor="pred-fuel">Fuel type</label>
          <select id="pred-fuel" value={form.fuel_type} onChange={field("fuel_type")}>
            {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Transmission */}
        <div className="form-field">
          <label htmlFor="pred-trans">Transmission</label>
          <select id="pred-trans" value={form.transmission} onChange={field("transmission")}>
            {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Submit */}
        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
            aria-busy={isPending}
          >
            {isPending
              ? <><i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin .7s linear infinite" }} /> Predicting…</>
              : <><i className="ti ti-brain" aria-hidden="true" /> Predict price</>
            }
          </button>
        </div>
      </form>

      {isError && (
        <div className="error-box" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <span>{error.message}</span>
        </div>
      )}

      {data && (
        <div className="predictor-results" role="region" aria-label="Prediction results">
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
