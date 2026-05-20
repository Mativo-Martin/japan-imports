import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card, Section, Spinner, Empty, BreakdownRow, StatCard } from "../components/UI";
import { compareImportVsLocal } from "../api/calculator";
// import "./Compare.css";

const fmtKES = n => n != null ? `KES ${Math.round(n).toLocaleString()}` : "—";
const fmtUSD = n => n != null ? `$${Math.round(n).toLocaleString()}` : "—";

export default function Compare() {
  const [params]  = useSearchParams();
  const [form, setForm] = useState({
    make:  params.get("make")  || "",
    model: params.get("model") || "",
    year:  params.get("year")  || "2021",
  });

  const { mutate, data, isPending, isError, error, reset } = useMutation({
    mutationFn: ({ make, model, year }) => compareImportVsLocal(make, model, year),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.make || !form.model) return;
    reset();
    mutate(form);
  };
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const saving   = data?.saving_kes;
  const hasSaving = saving != null;
  const isImport  = data?.verdict === "import";

  return (
    <div className="compare-page">
      <h2 className="sr-only">Compare import cost from Japan versus local Kenyan market price</h2>

      <div className="compare-layout">
        <div className="compare-form-col">
          <Card>
            <h3 className="form-title">Compare a car</h3>
            <p className="form-sub">Enter the car you want to compare. We'll look up Japan import cost and local Peach Cars price.</p>
            <form onSubmit={submit} className="compare-form">
              <div className="form-field">
                <label>Make</label>
                <input value={form.make} onChange={f("make")} placeholder="e.g. Toyota" required />
              </div>
              <div className="form-field">
                <label>Model</label>
                <input value={form.model} onChange={f("model")} placeholder="e.g. Vitz" required />
              </div>
              <div className="form-field">
                <label>Year</label>
                <select value={form.year} onChange={f("year")}>
                  {[2024,2023,2022,2021,2020,2019,2018].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ width: "100%", justifyContent: "center" }}>
                {isPending ? <><Spinner size={14} /> Comparing…</> : <><i className="ti ti-arrows-diff" aria-hidden="true" /> Compare</>}
              </button>
            </form>
          </Card>
        </div>

        <div className="compare-result-col">
          {isError && (
            <Card>
              <div className="error-box">
                <i className="ti ti-alert-circle" aria-hidden="true" />
                <span>{error?.message || "Comparison failed"}</span>
              </div>
            </Card>
          )}

          {data && (
            <>
              {hasSaving && (
                <div className={`verdict-banner ${isImport ? "verdict-import" : "verdict-local"}`}>
                  <i className={`ti ${isImport ? "ti-trending-down" : "ti-trending-up"}`} aria-hidden="true" />
                  <div>
                    <strong>{isImport ? "Importing saves money" : "Buying locally is cheaper"}</strong>
                    <p>{isImport
                      ? `You save ${fmtKES(saving)} (${data.saving_pct}%) by importing from Japan`
                      : `Local market is ${fmtKES(Math.abs(saving))} cheaper`}</p>
                  </div>
                </div>
              )}

              <div className="compare-cards">
                <Card className="compare-side import-side">
                  <div className="side-label">
                    <i className="ti ti-plane-departure" aria-hidden="true" />
                    Import from Japan
                  </div>
                  <div className="side-price">{fmtKES(data.import?.median_kes)}</div>
                  <div className="side-sub">Median landed cost · {data.import?.count} listings</div>
                  <div className="side-range">
                    {fmtKES(data.import?.min_kes)} – {fmtKES(data.import?.max_kes)}
                  </div>
                  <div className="side-japan-price">
                    Japan price: {fmtUSD(data.import?.best_purchase_usd)}
                  </div>
                </Card>

                <div className="vs-divider">
                  <span>VS</span>
                </div>

                <Card className={`compare-side local-side${!isImport ? " winner" : ""}`}>
                  <div className="side-label">
                    <i className="ti ti-map-pin" aria-hidden="true" />
                    Buy locally (Peach Cars)
                  </div>
                  {data.local?.median_kes ? (
                    <>
                      <div className="side-price">{fmtKES(data.local.median_kes)}</div>
                      <div className="side-sub">Median local price · {data.local.count} listings</div>
                      <div className="side-range">
                        {fmtKES(data.local.min_kes)} – {fmtKES(data.local.max_kes)}
                      </div>
                    </>
                  ) : (
                    <div className="no-local">No local listings found for this spec yet</div>
                  )}
                </Card>
              </div>
            </>
          )}

          {!data && !isPending && !isError && (
            <Empty icon="ti-arrows-diff" message="Enter a car above to compare" sub="We'll show import vs local price side by side" />
          )}
        </div>
      </div>
    </div>
  );
}