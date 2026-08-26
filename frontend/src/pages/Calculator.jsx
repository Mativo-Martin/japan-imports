import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { estimateImport } from "../api/calculator";

const fmtKES = (n) => n ? `KES ${Math.round(n).toLocaleString()}` : "—";
const fmtUSD = (n) => n ? `$${Math.round(n).toLocaleString()}` : "—";

const ROWS = [
  ["Purchase price (Japan)",  "purchase_usd",      "USD"],
  ["Shipping to Mombasa",     "shipping_usd",      "USD"],
  ["Insurance (1.5%)",        "insurance_usd",     "USD"],
  ["CIF value",               "cif_kes",           "KES"],
  ["Customs duty (25%)",      "customs_duty_kes",  "KES"],
  ["Excise duty (20%)",       "excise_duty_kes",   "KES"],
  ["VAT (16%)",               "vat_kes",           "KES"],
  ["IDF levy (3.5%)",         "idf_levy_kes",      "KES"],
  ["RDL levy (2%)",           "rdl_levy_kes",      "KES"],
  ["Port / CFS charges",      "port_cfs_kes",      "KES"],
  ["Clearing agent",          "clearing_agent_kes","KES"],
  ["NTSA inspection",         "ntsa_inspection_kes","KES"],
];

const BODY_TYPES = ["sedan", "hatchback", "suv", "wagon", "pickup", "minivan"];

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

      <form onSubmit={submit} className="calc-form" aria-label="Import cost calculator">
        <div>
          <label htmlFor="calc-price" className="form-label">
            Japan purchase price (USD)
          </label>
          <input
            id="calc-price"
            type="number"
            min="100"
            placeholder="e.g. 8 000"
            value={form.purchase_usd}
            onChange={e => setForm(f => ({ ...f, purchase_usd: e.target.value }))}
            required
            aria-describedby="calc-price-hint"
          />
          <span id="calc-price-hint" className="sr-only">
            Enter the FOB Japan price in US dollars
          </span>
        </div>

        <div>
          <label htmlFor="calc-body" className="form-label">Body type</label>
          <select
            id="calc-body"
            value={form.body_type}
            onChange={e => setForm(f => ({ ...f, body_type: e.target.value }))}
          >
            {BODY_TYPES.map(b => (
              <option key={b} value={b}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending || !form.purchase_usd}
          className="btn btn-primary"
          aria-busy={isPending}
        >
          {isPending
            ? <><i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin .7s linear infinite" }} /> Calculating…</>
            : <><i className="ti ti-calculator" aria-hidden="true" /> Calculate</>
          }
        </button>
      </form>

      {isError && (
        <div className="error-box" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <span>{error.message}</span>
        </div>
      )}

      {data && (
        <div className="calc-result" role="region" aria-label="Import cost breakdown">
          <div className="calc-result-title">
            <i className="ti ti-receipt" aria-hidden="true" />
            Full KRA breakdown
          </div>
          <div className="calc-breakdown">
            {ROWS.map(([label, key, cur]) => (
              <div key={key} className="calc-row">
                <span className="calc-label">{label}</span>
                <span className="calc-value">
                  {cur === "USD" ? fmtUSD(data[key]) : fmtKES(data[key])}
                </span>
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
