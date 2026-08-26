import { useState } from "react";
import { Link }      from "react-router-dom";
import { useListings, useMakes } from "../hooks/useListings";
import { Skeleton } from "../components/UI";

const fmtUSD = (n) => n ? `$${Number(n).toLocaleString()}` : "—";
const fmtKM  = (n) => n ? `${Number(n).toLocaleString()} km` : "—";

function ListingCardSkeleton() {
  return (
    <div className="skeleton-listing-card" aria-hidden="true">
      <div className="sk-lines">
        <Skeleton width="55%" height={14} />
        <Skeleton width="75%" height={12} />
        <Skeleton width="45%" height={12} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
        <Skeleton width={80} height={22} />
        <Skeleton width={60} height={10} />
      </div>
    </div>
  );
}

export default function Search() {
  const [filters, setFilters] = useState({ page: 1, page_size: 20 });
  const [form,    setForm]    = useState({});

  const { data: result, isLoading, isError, error } = useListings(filters);
  const { data: makes } = useMakes();

  const listings   = result?.data  ?? [];
  const total      = result?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.page_size ?? 20));

  const applyFilters = () => setFilters({ ...form, page: 1, page_size: 20 });
  const field = (key, val) => setForm(f => ({ ...f, [key]: val || undefined }));

  return (
    <div className="search-page">
      <h1>Browse import cars</h1>

      {/* Filter bar */}
      <fieldset
        className="search-filter-bar"
        aria-label="Filter listings"
        style={{ border: "none", padding: 0, margin: 0 }}
      >
        <legend className="sr-only">Filter car listings</legend>

        <div className="form-field">
          <label htmlFor="filter-make">Make</label>
          <select
            id="filter-make"
            onChange={e => field("make", e.target.value)}
          >
            <option value="">All makes</option>
            {makes?.map(m => (
              <option key={m.make} value={m.make}>
                {m.make} ({m.count})
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="filter-model">Model</label>
          <input
            id="filter-model"
            placeholder="e.g. Vitz"
            onChange={e => field("model", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="filter-fuel">Fuel type</label>
          <select
            id="filter-fuel"
            onChange={e => field("fuel_type", e.target.value)}
          >
            <option value="">All fuels</option>
            {["petrol", "diesel", "hybrid", "electric"].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="filter-price">Max price (USD)</label>
          <input
            id="filter-price"
            type="number"
            placeholder="e.g. 10000"
            onChange={e => field("price_max", e.target.value)}
          />
        </div>

        <button
          onClick={applyFilters}
          className="btn btn-primary"
          style={{ width: "100%", alignSelf: "flex-end" }}
        >
          <i className="ti ti-search" aria-hidden="true" />
          Search
        </button>
      </fieldset>

      {/* Results count */}
      <p
        className="search-count"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}
      >
        {isLoading ? "Searching…" : `${total.toLocaleString()} listing${total !== 1 ? "s" : ""} found`}
      </p>

      {isError && (
        <div className="error-box" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Results list */}
      <div className="search-results" aria-label="Search results">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)
          : listings.map(car => (
            <Link
              key={car.id}
              to={`/listings/${car.id}`}
              className="listing-card"
              aria-label={`${car.year} ${car.make} ${car.model} — ${fmtUSD(car.price_usd)}`}
            >
              <div className="listing-details">
                <div className="listing-title">
                  {car.year} {car.make} {car.model}
                </div>
                <div className="listing-specs">
                  {car.mileage_km && (
                    <span>
                      <i className="ti ti-road" aria-hidden="true" />
                      {fmtKM(car.mileage_km)}
                    </span>
                  )}
                  {car.engine_cc && (
                    <span>
                      <i className="ti ti-engine" aria-hidden="true" />
                      {car.engine_cc}cc
                    </span>
                  )}
                  {car.fuel_type && (
                    <span style={{ textTransform: "capitalize" }}>
                      <i className="ti ti-flame" aria-hidden="true" />
                      {car.fuel_type}
                    </span>
                  )}
                  {car.transmission && (
                    <span style={{ textTransform: "capitalize" }}>
                      <i className="ti ti-settings" aria-hidden="true" />
                      {car.transmission}
                    </span>
                  )}
                </div>
              </div>
              <div className="listing-price">
                <div className="listing-price-main">{fmtUSD(car.price_usd)}</div>
                <div className="listing-price-sub">Japan price</div>
              </div>
              <span className="listing-action" aria-hidden="true">
                Details →
              </span>
            </Link>
          ))
        }

        {!isLoading && !listings.length && !isError && (
          <div className="search-empty" role="status">
            <i className="ti ti-car-off" style={{ fontSize: 32, display: "block", marginBottom: 8 }} aria-hidden="true" />
            No listings match your filters — try broadening your search.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="pagination-controls" aria-label="Results pagination">
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="pagination-btn"
            aria-label="Previous page"
          >
            <i className="ti ti-chevron-left" aria-hidden="true" />
            Prev
          </button>
          <span className="pagination-info" aria-current="page">
            Page {filters.page} of {totalPages}
          </span>
          <button
            disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="pagination-btn"
            aria-label="Next page"
          >
            Next
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
