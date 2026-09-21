import React from 'react';
import { useApp } from '../context/AppContext';
import { GitCompare, X, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const CompareFloatingBar: React.FC = () => {
  const { comparisonCars, removeFromCompare, clearCompare } = useApp();

  if (comparisonCars.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94%] bg-white/95 border border-stone-200 rounded-2xl shadow-xl backdrop-blur-xl p-3 sm:p-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#000000] shrink-0 font-display">
              <GitCompare className="w-4 h-4 text-[#0E402D]" />
              <span>Comparing ({comparisonCars.length}/4):</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {comparisonCars.map((car) => {
                const img = car.images?.[0];
                return (
                  <div
                    key={car.id}
                    className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 text-xs shrink-0"
                  >
                    {img && (
                      <img
                        src={img}
                        alt={car.model}
                        className="w-6 h-6 rounded-md object-cover border border-stone-200"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="font-semibold text-stone-800 truncate max-w-[90px]">
                      {car.make} {car.model}
                    </span>
                    <button
                      onClick={() => removeFromCompare(car.id)}
                      className="text-stone-400 hover:text-stone-700 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={clearCompare}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors text-xs flex items-center gap-1"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <Link
              to="/compare"
              className="px-4 py-2 bg-[#0E402D] hover:bg-[#295135] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Side-by-Side View</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#9FCC2E]" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

