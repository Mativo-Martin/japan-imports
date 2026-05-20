import { useState } from "react";
import { Link } from "react-router-dom";
import { useListings } from "../hooks/useListings";
import { useMakes }    from "../hooks/useListings";

const fmtUSD = (n) => n ? `$${Number(n).toLocaleString()}` : "—";
const fmtKM  = (n) => n ? `${Number(n).toLocaleString()} km` : "—";

export default function Search() {
  const [filters, setFilters] = useState({ page: 1, page_size: 20 });
  const [form,    setForm]    = useState({});

  const { data: result, isLoading, isError, error } = useListings(filters);
  const { data: makes } = useMakes();

  const listings = result?.data  ?? [];
  const total    = result?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.page_size ?? 20));

  const applyFilters = () => setFilters({ ...form, page: 1, page_size: 20 });
  const field = (key, val) => setForm(f => ({ ...f, [key]: val || undefined }));

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "1.5rem" }}>Browse import cars</h1>

      {/* Filter bar */}
      <div style={{
        background: "#fff", border: "0.5px solid #e5e5e0", borderRadius: 12,
        padding: "1rem 1.25rem", marginBottom: "1.5rem",
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10,
      }}>
        <select onChange={e => field("make", e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
          <option value="">All makes</option>
          {makes?.map(m => <option key={m.make} value={m.make}>{m.make} ({m.count})</option>)}
        </select>
        <input placeholder="Model" onChange={e => field("model", e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }} />
        <select onChange={e => field("fuel_type", e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
          <option value="">All fuels</option>
          {["petrol","diesel","hybrid","electric"].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input type="number" placeholder="Max price USD" onChange={e => field("price_max", e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }} />
        <button onClick={applyFilters} style={{
          background: "#1D9E75", color: "#fff", border: "none",
          borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500,
        }}>Search</button>
      </div>

      {/* Results */}
      {isLoading && <div style={{ color: "#aaa", fontSize: 13 }}>Loading listings…</div>}
      {isError   && <div style={{ color: "#A32D2D", fontSize: 13 }}>{error.message}</div>}

      <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
        {total.toLocaleString()} listings found
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {listings.map(car => (
          <div key={car.id} style={{
            background: "#fff", border: "0.5px solid #e5e5e0", borderRadius: 12,
            padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>
                {car.year} {car.make} {car.model}
              </div>
              <div style={{ fontSize: 12, color: "#888", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>{fmtKM(car.mileage_km)}</span>
                <span>{car.engine_cc ? `${car.engine_cc}cc` : ""}</span>
                <span style={{ textTransform: "capitalize" }}>{car.fuel_type}</span>
                <span style={{ textTransform: "capitalize" }}>{car.transmission}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#1D9E75" }}>
                {fmtUSD(car.price_usd)}
              </div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Japan price</div>
            </div>
            <Link to={`/listings/${car.id}`} style={{
              background: "#f4f4f0", border: "none", borderRadius: 8,
              padding: "8px 14px", fontSize: 13, cursor: "pointer",
              textDecoration: "none", color: "#333",
            }}>Details →</Link>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: "1.5rem", justifyContent: "center" }}>
          <button disabled={filters.page === 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            style={{ padding: "6px 14px", borderRadius: 8, border: "0.5px solid #ddd", cursor: "pointer", fontSize: 13 }}>← Prev</button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: "#666" }}>
            {filters.page} / {totalPages}
          </span>
          <button disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            style={{ padding: "6px 14px", borderRadius: 8, border: "0.5px solid #ddd", cursor: "pointer", fontSize: 13 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
