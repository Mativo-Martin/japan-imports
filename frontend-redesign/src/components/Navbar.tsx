import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Compass,
  Calculator,
  GitCompare,
  Sparkles,
  Bookmark,
  RefreshCw,
  TrendingUp,
  Menu,
  X,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { usdKesRate, rateLoading, refreshRate, currencyMode, setCurrencyMode, savedCarIds } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Overview', icon: Compass },
    { to: '/marketplace', label: 'Marketplace', icon: Search },
    { to: '/calculator', label: 'KRA Calculator', icon: Calculator },
    { to: '/compare', label: 'Price Benchmark', icon: GitCompare },
    { to: '/predictor', label: 'AI Valuation', icon: Sparkles },
    { to: '/watchlist', label: 'Watchlist', icon: Bookmark, badge: savedCarIds.length },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-[#FAFAF7]/95 backdrop-blur-md transition-all">
      {/* Top micro-bar: FX rate and KRA status */}
      <div className="border-b border-stone-200/60 bg-[#F4F4EE]/90 py-1.5 px-4 sm:px-6 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-2 font-medium text-stone-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#000000] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#000000]"></span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6650]">Live FX</span>
              <span className="font-mono-num font-semibold text-[#000000]">1 USD = {usdKesRate.toFixed(2)} KES</span>
              <button
                onClick={() => refreshRate()}
                disabled={rateLoading}
                title="Refresh Live Central Bank Rate"
                className="hover:text-stone-900 transition-colors p-0.5 rounded ml-0.5 text-stone-400 hover:bg-stone-200"
              >
                <RefreshCw className={`w-3 h-3 ${rateLoading ? 'animate-spin text-[#000000]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 rounded-lg bg-[#000000] flex items-center justify-center text-[#9FCC2E] shadow-xs group-hover:bg-[#295135] transition-colors border border-[#000000]">
            <span className="font-display font-black text-sm tracking-tighter">JZ</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold tracking-tight text-lg text-[#000000]">
                Japan<span className="text-[#000000]">Eazy</span>
              </span>
            </div>
            <p className="text-[11px] text-[#5A6650] -mt-0.5 hidden sm:block font-medium">
              Japan Import & Kenya Duty Intelligence
            </p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${isActive
                    ? 'bg-[#000000] text-white font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-[#000000] hover:bg-stone-100/80'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 text-stone-500" />
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#9FCC2E] text-[#000000] border border-[#000000]/20">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/marketplace"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-xs text-stone-700 hover:text-stone-900 transition-colors shadow-2xs"
          >
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <span>Search Inventory</span>
          </Link>

          <Link
            to="/calculator"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#000000] hover:bg-[#295135] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs border border-[#000000]"
          >
            <Calculator className="w-3.5 h-3.5 text-[#9FCC2E]" />
            <span>Duty Simulator</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-[#FAFAF7] px-4 py-4 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-[#000000] text-white font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-stone-500" />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#9FCC2E] text-[#000000]">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
};
