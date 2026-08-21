import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import "../styles/layout.css";

const NAV = [
  { to: "/",           icon: "ti-dashboard",  label: "Dashboard"      },
  { to: "/search",     icon: "ti-search",     label: "Browse cars"    },
  { to: "/calculator", icon: "ti-calculator", label: "Import calc"    },
  { to: "/predictor",  icon: "ti-brain",      label: "Price predictor"},
  { to: "/compare",    icon: "ti-arrows-diff",label: "Compare"        },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const pageTitle = {
    "/":           "Dashboard",
    "/search":     "Browse cars",
    "/calculator": "Import calculator",
    "/predictor":  "Price predictor",
    "/compare":    "Compare import vs local",
  }[location.pathname] || "Detail";

  return (
    <div className={`layout${collapsed ? " collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🇯🇵</span>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">Vehicle Imports</span>
              <span className="brand-sub">Kenya · Japan</span>
            </div>
          )}
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`ti ${collapsed ? "ti-chevron-right" : "ti-chevron-left"}`} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <i className={`ti ${icon}`} aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
              {collapsed && <span className="tooltip">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="footer-note">
              <span className="dot" />
              <span>Live data · BF &amp; Peach Cars</span>
            </div>
          )}
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-right">
            {/* <span className="topbar-badge">
              <i className="ti ti-refresh" aria-hidden="true" style={{ fontSize: 13 }} />
              Updated daily
            </span> */}
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
