import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { estimateImport } from "../api/calculator";

const fmtKES = (n) => n ? `KES ${Math.round(n).toLocaleString()}` : "—";
const fmtUSD = (n) => n ? `$${Math.round(n).toLocaleString()}` : "—";

const ROWS = [
  ["Purchase price (Japan)",  "purchase_usd",     "USD"],
  ["Shipping to Mombasa",     "shipping_usd",     "USD"],
  ["Insurance (1.5%)",        "insurance_usd",    "USD"],
  ["CIF value",               "cif_kes",          "KES"],
  ["Customs duty (25%)",      "customs_duty_kes", "KES"],
  ["Excise duty (20%)",       "excise_duty_kes",  "KES"],
  ["VAT (16%)",               "vat_kes",          "KES"],
  ["IDF levy (3.5%)",         "idf_levy_kes",     "KES"],
  ["RDL levy (2%)",           "rdl_levy_kes",     "KES"],
  ["Port / CFS charges",      "port_cfs_kes",     "KES"],
  ["Clearing agent",          "clearing_agent_kes","KES"],
  ["NTSA inspection",         "ntsa_inspection_kes","KES"],
];

export default function Calculator() {
  const [form, setForm] = useState({ purchase_usd: "", body_type: "sedan" });
  const { mutate, data, isPending, isError, error } = useMutation({ mutationFn: estimateImport });

  const submit = (e) => {
    e.preventDefault();
    if (!form.purchase_usd) return;
    mutate({ purchase_usd: parseFloat(form.purchase_usd), body_type: form.body_type });
  };

  return (
    <div className="calculator-page">
      <h1>Import cost calculator</h1>

      <form onSubmit={submit} className="calc-form">
        <div>
          <label className="form-label">Japan purchase price (USD)</label>
          <input type="number" min="100" placeholder="e.g. 8000" value={form.purchase_usd}
            onChange={e => setForm(f => ({ ...f, purchase_usd: e.target.value }))}
            className="form-field" />
        </div>
        <div>
          <label className="form-label">Body type</label>
          <select value={form.body_type} onChange={e => setForm(f => ({ ...f, body_type: e.target.value }))}
            className="form-field">
            {["sedan","hatchback","suv","wagon","pickup","minivan"].map(b =>
              <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Calculating…" : "Calculate"}</button>
      </form>

      {isError && <div className="error-msg">{error.message}</div>}

      {data && (
        <div className="calc-result">
          <div className="calc-result-title">Full KRA breakdown</div>
          <div className="calc-breakdown">
            {ROWS.map(([label, key, cur]) => (
              <div key={key} className="calc-row">
                <span className="calc-label">{label}</span>
                <span className="calc-value">{cur === "USD" ? fmtUSD(data[key]) : fmtKES(data[key])}</span>
              </div>
            ))}
            <div className="calc-total">
              <span>Total landed cost</span>
              <span>{fmtKES(data.total_import_kes)}</span>
            </div>
            <div className="calc-rate">
              Rate used: 1 USD = KES {data.usd_kes_rate?.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
