import { useParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useListing } from "../hooks/useListings";
import { estimateImport } from "../api/calculator";
import { Card, Section, Spinner, Empty, Badge, BreakdownRow, Pill } from "../components/UI";
import { useEffect } from "react";
import "./ListingDetail.css";

const fmtUSD = n => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
const fmtKES = n => n != null ? `KES ${Math.round(n).toLocaleString()}` : "—";
const fmtKM  = n => n != null ? `${Math.round(n).toLocaleString()} km` : "—";

export default function ListingDetail() {
  const { id } = useParams();
  const { data: car, isLoading, isError } = useListing(id);
  const { mutate, data: cost, isPending } = useMutation({ mutationFn: estimateImport });

  useEffect(() => {
    if (car?.price_usd) {
      mutate({
        purchase_usd: car.price_usd,
        body_type:    car.body_type || "sedan",
        listing_id:   car.id,
      });
    }
  }, [car?.id]);

  if (isLoading) return <Spinner size={32} />;
  if (isError || !car) return (
    <Empty icon="ti-car-off" message="Listing not found">
      <Link to="/search" className="btn btn-ghost" style={{ marginTop: 12 }}>← Back to search</Link>
    </Empty>
  );

  const specs = [
    { icon: "ti-calendar",     label: "Year",         value: car.year },
    { icon: "ti-road",         label: "Mileage",      value: fmtKM(car.mileage_km) },
    { icon: "ti-engine",       label: "Engine",       value: car.engine_cc ? `${car.engine_cc.toLocaleString()}cc` : "—" },
    { icon: "ti-flame",        label: "Fuel",         value: car.fuel_type ? car.fuel_type.charAt(0).toUpperCase() + car.fuel_type.slice(1) : "—" },
    { icon: "ti-settings",     label: "Transmission", value: car.transmission ? car.transmission.charAt(0).toUpperCase() + car.transmission.slice(1) : "—" },
    { icon: "ti-car",          label: "Body type",    value: car.body_type   ? car.body_type.charAt(0).toUpperCase()   + car.body_type.slice(1)   : "—" },
  ];

  const breakdownRows = cost ? [
    { label: "Japan purchase price",   value: fmtUSD(cost.purchase_usd),       bold: false },
    { label: "Shipping to Mombasa",    value: fmtUSD(cost.shipping_usd),       bold: false },
    { label: "Insurance (1.5%)",       value: fmtUSD(cost.insurance_usd),      bold: false },
    { label: "CIF value",              value: fmtKES(cost.cif_kes),            bold: false },
    { label: "Customs duty (25% CIF)", value: fmtKES(cost.customs_duty_kes),   bold: false },
    { label: "Excise duty (20%)",      value: fmtKES(cost.excise_duty_kes),    bold: false },
    { label: "VAT (16%)",              value: fmtKES(cost.vat_kes),            bold: false },
    { label: "IDF levy (3.5%)",        value: fmtKES(cost.idf_levy_kes),       bold: false },
    { label: "RDL levy (2%)",          value: fmtKES(cost.rdl_levy_kes),       bold: false },
    { label: "Port / CFS charges",     value: fmtKES(cost.port_cfs_kes),       bold: false },
    { label: "Clearing agent",         value: fmtKES(cost.clearing_agent_kes), bold: false },
    { label: "NTSA inspection + plates", value: fmtKES((cost.ntsa_inspection_kes || 0) + (cost.number_plates_kes || 0)), bold: false },
  ] : [];

  return (
    <div className="detail-page">
      <h2 className="sr-only">Import cost details for {car.year} {car.make} {car.model}</h2>

      <div className="detail-nav">
        <Link to="/search" className="back-link">
          <i className="ti ti-arrow-left" aria-hidden="true" /> Back to search
        </Link>
        {car.url && (
          <a href={car.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            View on BE FORWARD <i className="ti ti-external-link" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="detail-grid">
        <div className="detail-left">
          <Card className="car-header-card">
            <div className="car-make-badge">
              <Badge variant="teal">{car.source?.toUpperCase()}</Badge>
            </div>
            <h1 className="car-title">{car.year} {car.make} {car.model}</h1>
            <div className="car-price-block">
              <span className="car-price-main">{fmtUSD(car.price_usd)}</span>
              <span className="car-price-label">Japan FOB price</span>
            </div>
            <div className="specs-grid">
              {specs.map(s => (
                <div key={s.label} className="spec-item">
                  <i className={`ti ${s.icon}`} aria-hidden="true" />
                  <div>
                    <span className="spec-label">{s.label}</span>
                    <span className="spec-value">{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="detail-right">
          <Card>
            <div className="breakdown-header">
              <div>
                <h2 className="breakdown-title">Full import cost</h2>
                <p className="breakdown-sub">KRA taxes &amp; charges (2024 rates)</p>
              </div>
              {isPending && <Spinner size={18} />}
            </div>

            {cost ? (
              <>
                <div className="breakdown-list">
                  {breakdownRows.map(r => (
                    <BreakdownRow key={r.label} label={r.label} value={r.value} />
                  ))}
                </div>

                <div className="breakdown-total">
                  <div className="total-row">
                    <span className="total-label">Total landed cost</span>
                    <span className="total-value">{fmtKES(cost.total_import_kes)}</span>
                  </div>
                  <div className="total-sub">
                    ≈ {fmtUSD(cost.total_import_usd)} · Rate: 1 USD = KES {cost.usd_kes_rate?.toFixed(2)}
                  </div>
                </div>

                <div className="breakdown-actions">
                  <Link to={`/compare?make=${encodeURIComponent(car.make)}&model=${encodeURIComponent(car.model)}&year=${car.year}`}
                    className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    <i className="ti ti-arrows-diff" aria-hidden="true" />
                    Compare vs local market
                  </Link>
                </div>
              </>
            ) : !isPending ? (
              <Empty message="Cost calculation unavailable" sub="Price data missing" />
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}