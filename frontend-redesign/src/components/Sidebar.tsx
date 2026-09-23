import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Compass,
  Calculator,
  GitCompare,
  Sparkles,
  Bookmark,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { usdKesRate, rateLoading, refreshRate, savedCarIds } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Overview', icon: Compass },
    { to: '/marketplace', label: 'Marketplace', icon: Search },
    { to: '/calculator', label: 'KRA Duty Calculator', icon: Calculator },
    { to: '/compare', label: 'Price Benchmark', icon: GitCompare },
    { to: '/predictor', label: 'AI Valuation', icon: Sparkles },
    { to: '/watchlist', label: 'Watchlist', icon: Bookmark, badge: savedCarIds.length },
  ];

  return (
    <>
      {/* ── Mobile Top Header ── */}
      <header className="lg:hidden sticky top-0 z-40 w-full h-14 bg-[#000000] border-b border-[#295135] px-4 flex items-center justify-between text-white shadow-xs">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#295135] flex items-center justify-center text-[#6BD425] font-black text-xs border border-[#6BD425]/40 shadow-xs">
            JZ
          </div>
          <span className="font-display font-black text-base tracking-tight text-white">
            Japan<span className="text-[#6BD425]">Eazy</span>
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#295135]/80 text-[11px] font-mono-num text-[#6BD425] border border-[#295135]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6BD425] animate-pulse"></span>
            <span>${usdKesRate.toFixed(1)}</span>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-stone-200 hover:text-white hover:bg-[#295135] transition-colors"
            aria-label="Toggle navigation drawer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer Backdrop & Menu ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-[#000000] text-white h-full flex flex-col p-5 shadow-2xl z-10 border-r border-[#295135]">
            <div className="flex items-center justify-between pb-4 border-b border-[#295135]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#295135] flex items-center justify-center text-[#6BD425] font-black text-xs border border-[#6BD425]/40">
                  JZ
                </div>
                <div>
                  <h2 className="font-display font-black text-base text-white">
                    Japan<span className="text-[#6BD425]">Eazy</span>
                  </h2>
                  <p className="text-[10px] text-stone-300">Kenya Duty Intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-stone-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                        ? 'bg-[#295135] text-[#6BD425] shadow-xs'
                        : 'text-stone-200 hover:bg-[#295135]/50 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </div>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#6BD425] text-[#000000]">
                        {link.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Mobile FX card */}
            <div className="pt-3 border-t border-[#295135] space-y-3">
              <div className="p-3 rounded-xl bg-[#295135]/60 border border-[#295135] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6BD425] tracking-wider block">Live Exchange Rate</span>
                  <span className="text-xs font-mono-num font-bold text-white">1 USD = {usdKesRate.toFixed(2)} KES</span>
                </div>
                <button
                  onClick={() => refreshRate()}
                  disabled={rateLoading}
                  className="p-1.5 rounded-lg bg-[#000000] hover:bg-[#000000] text-stone-300 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rateLoading ? 'animate-spin text-[#6BD425]' : ''}`} />
                </button>
              </div>

              <Link
                to="/calculator"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#5bc01e] text-[#000000] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Calculator className="w-4 h-4" />
                <span>Duty Simulator</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Persistent Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen bg-[#000000] border-r border-[#295135] text-white z-30 transition-all duration-300 select-none ${collapsed ? 'w-[72px]' : 'w-64'
          }`}
      >
        {/* Top Branding Section */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#295135]/80 shrink-0">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#295135] flex items-center justify-center text-[#6BD425] font-black text-sm shrink-0 border border-[#6BD425]/40 shadow-xs">
              JZ
            </div>
            {!collapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="font-display font-black text-lg tracking-tight text-white truncate">
                  Japan<span className="text-[#6BD425]">Eazy</span>
                </div>
                <p className="text-[10px] text-stone-300 truncate -mt-1 font-medium">
                  Duty & Market Intel
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={collapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                    ? 'bg-[#295135] text-[#6BD425] shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-[#295135]/50'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#6BD425]' : 'text-stone-300 group-hover:text-white'
                        }`}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1 font-medium">{link.label}</span>
                    )}

                    {link.badge !== undefined && link.badge > 0 && (
                      <span
                        className={`font-bold rounded-full bg-[#6BD425] text-[#000000] shrink-0 ${collapsed
                          ? 'absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px]'
                          : 'px-2 py-0.5 text-[10px]'
                          }`}
                      >
                        {link.badge}
                      </span>
                    )}

                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#6BD425]"></span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Live FX Rate Widget */}
        {!collapsed && (
          <div className="px-3 pb-3 shrink-0">
            <div className="p-3 rounded-xl bg-[#295135]/50 border border-[#295135] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6BD425] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6BD425]"></span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#6BD425] tracking-wider">
                    Live FX Rate
                  </span>
                </div>
                <button
                  onClick={() => refreshRate()}
                  disabled={rateLoading}
                  title="Refresh Live Central Bank Exchange Rate"
                  className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-[#000000] transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${rateLoading ? 'animate-spin text-[#6BD425]' : ''}`} />
                </button>
              </div>

              <div className="flex items-baseline justify-between font-mono-num">
                <span className="text-xs text-stone-200">1 USD =</span>
                <span className="text-sm font-bold text-white">{usdKesRate.toFixed(2)} KES</span>
              </div>
            </div>
          </div>
        )}

        {/* Duty Simulator CTA */}
        <div className="px-3 pb-3 shrink-0">
          <Link
            to="/calculator"
            title={collapsed ? 'KRA Duty Simulator' : undefined}
            className={`w-full py-2.5 rounded-xl bg-white hover:bg-[#5bc01e] text-[#000000] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors ${collapsed ? 'px-0' : 'px-3'
              }`}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Duty Simulator</span>}
          </Link>
        </div>

        {/* Bottom Sidebar Collapse / Expand Toggle */}
        <div className="h-12 px-3 flex items-center justify-between border-t border-[#295135]/80 shrink-0 bg-[#000000]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full py-1.5 px-2 rounded-lg text-stone-300 hover:text-white hover:bg-[#295135] transition-colors flex items-center text-xs font-semibold ${collapsed ? 'justify-center' : 'justify-between'
              }`}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {!collapsed && <span>Collapse Sidebar</span>}
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
