import "./UI.css";

export function Card({ children, className = "", style = {} }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className={`stat-card${accent ? " accent-" + accent : ""}`}>
      {icon && <i className={`ti ${icon} stat-icon`} aria-hidden="true" />}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? "—"}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Badge({ children, variant = "default" }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function Spinner({ size = 20 }) {
  return (
    <div className="spinner-wrap" style={{ minHeight: size * 3 }}>
      <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />
    </div>
  );
}

export function Empty({ icon = "ti-inbox", message = "No data yet", sub }) {
  return (
    <div className="empty-state">
      <i className={`ti ${icon} empty-icon`} aria-hidden="true" />
      <p className="empty-msg">{message}</p>
      {sub && <p className="empty-sub">{sub}</p>}
    </div>
  );
}

export function Section({ title, sub, action, children }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-header">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {sub   && <p  className="section-sub">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pill({ children, color = "teal" }) {
  return <span className={`pill pill-${color}`}>{children}</span>;
}

export function Divider() {
  return <div className="divider" />;
}

export function BreakdownRow({ label, value, highlight }) {
  return (
    <div className={`breakdown-row${highlight ? " highlight" : ""}`}>
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-value">{value}</span>
    </div>
  );
}

export function PriceTag({ amount, currency = "USD", size = "md" }) {
  const fmt = currency === "KES"
    ? `KES ${Math.round(amount).toLocaleString()}`
    : `$${Math.round(amount).toLocaleString()}`;
  return <span className={`price-tag price-${size}`}>{fmt}</span>;
}