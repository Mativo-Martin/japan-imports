import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-[#F4F4EE] text-stone-600">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="lg:pr-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5"
              aria-label="JapanEazy home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E402D] font-display text-xs font-black text-[#9FCC2E]">
                JZ
              </span>

              <span className="font-display text-base font-extrabold tracking-tight text-[#000000]">
                Japan<span className="text-[#0E402D]">Eazy</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-xs leading-5 text-[#5A6650]">
              Vehicle import intelligence for Kenya — compare Japan stock,
              estimate landed costs, and understand the local market.
            </p>

            <p className="mt-4 text-[11px] leading-4 text-stone-400">
              Data sourced from Japanese exporters and Kenyan market listings.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#000000]">
              Tools
            </h3>

            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to="/calculator"
                  className="transition-colors hover:text-[#0E402D]"
                >
                  Duty & landed cost calculator
                </Link>
              </li>

              <li>
                <Link
                  to="/compare"
                  className="transition-colors hover:text-[#0E402D]"
                >
                  Import vs local prices
                </Link>
              </li>

              <li>
                <Link
                  to="/predictor"
                  className="transition-colors hover:text-[#0E402D]"
                >
                  Residual value estimator
                </Link>
              </li>

              <li>
                <Link
                  to="/marketplace"
                  className="transition-colors hover:text-[#0E402D]"
                >
                  Japan vehicle inventory
                </Link>
              </li>

              <li>
                <Link
                  to="/watchlist"
                  className="transition-colors hover:text-[#0E402D]"
                >
                  Saved vehicles
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular models */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#000000]">
              Popular imports
            </h3>

            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to="/marketplace?make=Toyota&model=Harrier"
                  className="transition-colors hover:text-[#000000]"
                >
                  Toyota Harrier
                </Link>
              </li>

              <li>
                <Link
                  to="/marketplace?make=Mazda&model=CX-5"
                  className="transition-colors hover:text-[#000000]"
                >
                  Mazda CX-5
                </Link>
              </li>

              <li>
                <Link
                  to="/marketplace?make=Toyota&model=Prado"
                  className="transition-colors hover:text-[#000000]"
                >
                  Toyota Land Cruiser Prado
                </Link>
              </li>

              <li>
                <Link
                  to="/marketplace?make=Subaru&model=Forester"
                  className="transition-colors hover:text-[#000000]"
                >
                  Subaru Forester
                </Link>
              </li>

              <li>
                <Link
                  to="/marketplace?make=Nissan&model=Note"
                  className="transition-colors hover:text-[#000000]"
                >
                  Nissan Note e-POWER
                </Link>
              </li>
            </ul>
          </div>

          {/* Official resources */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#000000]">
              Official resources
            </h3>

            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="https://www.kra.go.ke"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#000000]"
                >
                  Kenya Revenue Authority
                  <ExternalLink className="h-3 w-3 text-[#5A6650]" />
                </a>
              </li>

              <li>
                <a
                  href="https://ntsa.go.ke"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#000000]"
                >
                  NTSA
                  <ExternalLink className="h-3 w-3 text-[#5A6650]" />
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
                  <ExternalLink className="h-3 w-3 text-[#5A6650]" />
                </a>
              </li>

              <li>
                <a
                  href="https://qisj.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#000000]"
                >
                  QISJ
                  <ExternalLink className="h-3 w-3 text-[#5A6650]" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-200/80 bg-[#EFEFEA]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} JapanEazy. Estimates are indicative
            and may vary from official assessments.
          </p>

          <span className="inline-flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#0E402D]"
              aria-hidden="true"
            />
            Live Central Bank FX
          </span>
        </div>
      </div>
    </footer>
  );
};