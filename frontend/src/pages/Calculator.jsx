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
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "1.5rem" }}>Import cost calculator</h1>

      <form onSubmit={submit} style={{
        background: "#fff", border: "0.5px solid #e5e5e0", borderRadius: 12,
        padding: "1.25rem", marginBottom: "1.5rem",
        display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end",
      }}>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Japan purchase price (USD)</label>
          <input type="number" min="100" placeholder="e.g. 8000" value={form.purchase_usd}
            onChange={e => setForm(f => ({ ...f, purchase_usd: e.target.value }))}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 14 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Body type</label>
          <select value={form.body_type} onChange={e => setForm(f => ({ ...f, body_type: e.target.value }))}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 14 }}>
            {["sedan","hatchback","suv","wagon","pickup","minivan"].map(b =>
              <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <button type="submit" disabled={isPending} style={{
          background: "#1D9E75", color: "#fff", border: "none",
          borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 500,
        }}>{isPending ? "Calculating…" : "Calculate"}</button>
      </form>

      {isError && <div style={{ color: "#A32D2D", marginBottom: 12, fontSize: 13 }}>{error.message}</div>}

      {data && (
        <div style={{ background: "#fff", border: "0.5px solid #e5e5e0", borderRadius: 12, padding: "1.25rem" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem" }}>Full KRA breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {ROWS.map(([label, key, cur]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f4f4f0", fontSize: 13 }}>
                <span style={{ color: "#555" }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{cur === "USD" ? fmtUSD(data[key]) : fmtKES(data[key])}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 16, fontWeight: 500, color: "#1D9E75" }}>
              <span>Total landed cost</span>
              <span>{fmtKES(data.total_import_kes)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", textAlign: "right", marginTop: 2 }}>
              Rate used: 1 USD = KES {data.usd_kes_rate?.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
