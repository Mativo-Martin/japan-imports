import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/layout.css";

const NAV = [
  { to: "/",           icon: "ti-dashboard",   label: "Dashboard"       },
  { to: "/search",     icon: "ti-search",      label: "Browse cars"     },
  { to: "/calculator", icon: "ti-calculator",  label: "Import calc"     },
  { to: "/predictor",  icon: "ti-brain",       label: "Price predictor" },
  { to: "/compare",    icon: "ti-arrows-diff", label: "Compare"         },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  /* Close mobile drawer on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* Trap body scroll when mobile drawer is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const pageTitle = {
    "/":           "Dashboard",
    "/search":     "Browse cars",
    "/calculator": "Import calculator",
    "/predictor":  "Price predictor",
    "/compare":    "Compare import vs local",
  }[location.pathname] || "Detail";

  return (
    <>
      {/* Skip navigation — WCAG 2.4.1 */}
      <a href="#main-content" className="skip-nav">Skip to main content</a>

      <div className={`layout${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>

        {/* Mobile backdrop overlay */}
        {mobileOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className="sidebar"
          aria-label="Main navigation"
          aria-hidden={!mobileOpen ? undefined : undefined}
        >
          <div className="sidebar-brand">
            <span className="brand-icon" aria-hidden="true">🇯🇵</span>
            {!collapsed && (
              <div className="brand-text">
                <span className="brand-name">Vehicle Imports</span>
                <span className="brand-sub">Kenya · Japan</span>
              </div>
            )}
            {/* Desktop collapse toggle */}
            <button
              className="collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              <i className={`ti ${collapsed ? "ti-chevron-right" : "ti-chevron-left"}`} aria-hidden="true" />
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Site navigation">
            {NAV.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                aria-current={location.pathname === to || (to === "/" && location.pathname === "/") ? "page" : undefined}
              >
                <i className={`ti ${icon}`} aria-hidden="true" />
                {!collapsed && <span>{label}</span>}
                {collapsed && <span className="tooltip" role="tooltip">{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            {!collapsed && (
              <div className="footer-note">
                <span className="dot" aria-hidden="true" />
                <span>Live data · BF &amp; Peach Cars</span>
              </div>
            )}
          </div>
        </aside>

        <div className="main-wrap">
          <header className="topbar">
            {/* Mobile hamburger */}
            <button
              className="hamburger-btn"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
            >
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
            </button>

            <h1 className="topbar-title">{pageTitle}</h1>

            <div className="topbar-right">
              <div className="topbar-status" aria-label="Data status: Live">
                <span className="dot" aria-hidden="true" />
                <span>Live</span>
              </div>
            </div>
          </header>

          <main className="page-content" id="main-content" tabIndex="-1">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar — always visible on small screens */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}
          >
            <i className={`ti ${icon}`} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
