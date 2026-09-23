import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-[#000000]/10 bg-white text-stone-600">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="JapanEazy home">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#000000] font-display text-xs font-black text-[#6BD425]">
                JZ
              </span>
              <span className="font-display text-base font-extrabold tracking-tight text-[#000000]">
                Japan<span className="text-[#000000]">Eazy</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-stone-600">
              Vehicle import intelligence & Kenya Revenue Authority duty computation platform.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#000000]">
              Intelligence Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/marketplace" className="transition-colors hover:text-[#000000]">
                  Japan Inventory Search
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="transition-colors hover:text-[#000000]">
                  KRA Duty Calculator
                </Link>
              </li>
              <li>
                <Link to="/compare" className="transition-colors hover:text-[#000000]">
                  Price Benchmark & Savings
                </Link>
              </li>
              <li>
                <Link to="/predictor" className="transition-colors hover:text-[#000000]">
                  AI Valuation & Depreciation
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Imports */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#000000]">
              Popular Imports
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/marketplace?make=Toyota&model=Harrier" className="transition-colors hover:text-[#000000]">
                  Toyota Harrier
                </Link>
              </li>
              <li>
                <Link to="/marketplace?make=Mazda&model=CX-5" className="transition-colors hover:text-[#000000]">
                  Mazda CX-5
                </Link>
              </li>
              <li>
                <Link to="/marketplace?make=Toyota&model=Prado" className="transition-colors hover:text-[#000000]">
                  Toyota Land Cruiser Prado
                </Link>
              </li>
              <li>
                <Link to="/marketplace?make=Subaru&model=Forester" className="transition-colors hover:text-[#000000]">
                  Subaru Forester
                </Link>
              </li>
            </ul>
          </div>

          {/* Verification & Compliance */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#000000]">
              Official Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://www.kra.go.ke"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#000000]"
                >
                  Kenya Revenue Authority
                  <ExternalLink className="h-3 w-3 text-stone-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.kpa.co.ke"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#000000]"
                >
                  Kenya Ports Authority
                  <ExternalLink className="h-3 w-3 text-stone-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://ntsa.go.ke"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#000000]"
                >
                  NTSA Portal
                  <ExternalLink className="h-3 w-3 text-stone-400" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500">
          <p>© {new Date().getFullYear()} JapanEazy. Kenya Import & Valuation Intelligence.</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6BD425]"></span>
            <span>Verified KRA 2026 Duty Formula</span>
          </div>
        </div>
      </div>
    </footer>
  );
};