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
    <div className="search-page">
      <h1>Browse import cars</h1>

      <div className="search-filter-bar">
        <select onChange={e => field("make", e.target.value)} className="form-field">
          <option value="">All makes</option>
          {makes?.map(m => <option key={m.make} value={m.make}>{m.make} ({m.count})</option>)}
        </select>
        <input placeholder="Model" onChange={e => field("model", e.target.value)} className="form-field" />
        <select onChange={e => field("fuel_type", e.target.value)} className="form-field">
          <option value="">All fuels</option>
          {["petrol","diesel","hybrid","electric"].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input type="number" placeholder="Max price USD" onChange={e => field("price_max", e.target.value)} className="form-field" />
        <button onClick={applyFilters} className="btn btn-primary" style={{ width: "100%" }}>Search</button>
      </div>

      {isLoading && <div className="search-empty">Loading listings…</div>}
      {isError   && <div style={{ color: "#A32D2D", fontSize: 13 }}>{error.message}</div>}

      <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
        {total.toLocaleString()} listings found
      </div>

      <div className="search-results">
        {listings.map(car => (
          <div key={car.id} className="listing-card">
            <div className="listing-details">
              <div className="listing-title">
                {car.year} {car.make} {car.model}
              </div>
              <div className="listing-specs">
                <span>{fmtKM(car.mileage_km)}</span>
                <span>{car.engine_cc ? `${car.engine_cc}cc` : ""}</span>
                <span style={{ textTransform: "capitalize" }}>{car.fuel_type}</span>
                <span style={{ textTransform: "capitalize" }}>{car.transmission}</span>
              </div>
            </div>
            <div className="listing-price">
              <div className="listing-price-main">
                {fmtUSD(car.price_usd)}
              </div>
              <div className="listing-price-sub">Japan price</div>
            </div>
            <Link to={`/listings/${car.id}`} className="listing-action">Details →</Link>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button disabled={filters.page === 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="pagination-btn">← Prev</button>
          <span className="pagination-info">
            {filters.page} / {totalPages}
          </span>
          <button disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="pagination-btn">Next →</button>
        </div>
      )}
    </div>
  );
}
