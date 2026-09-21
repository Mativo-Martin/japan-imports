import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CarListing } from '../types';
import { apiClient } from '../api/client';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  usdKesRate: number;
  rateLoading: boolean;
  currencyMode: 'KES' | 'USD';
  setCurrencyMode: (mode: 'KES' | 'USD') => void;
  refreshRate: () => Promise<void>;
  savedCarIds: number[];
  savedCars: CarListing[];
  toggleSaveCar: (car: CarListing) => void;
  clearSavedCars: () => void;
  isCarSaved: (id: number) => boolean;
  comparisonCars: CarListing[];
  addToCompare: (car: CarListing) => boolean;
  removeFromCompare: (id: number) => void;
  clearCompare: () => void;
  isComparing: (id: number) => boolean;
  selectedCarForDutyModal: CarListing | null;
  openDutyModal: (car: CarListing) => void;
  closeDutyModal: () => void;
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usdKesRate, setUsdKesRate] = useState<number>(129.5);
  const [rateLoading, setRateLoading] = useState<boolean>(false);
  const [currencyMode, setCurrencyMode] = useState<'KES' | 'USD'>('KES');
  
  const [savedCars, setSavedCars] = useState<CarListing[]>(() => {
    try {
      const stored = localStorage.getItem('japan_imports_saved_cars');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [comparisonCars, setComparisonCars] = useState<CarListing[]>([]);
  const [selectedCarForDutyModal, setSelectedCarForDutyModal] = useState<CarListing | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const savedCarIds = savedCars.map((c) => c.id);

  // Fetch exchange rate on startup
  const refreshRate = useCallback(async () => {
    setRateLoading(true);
    try {
      const data = await apiClient.getExchangeRate();
      if (data?.usd_kes) {
        setUsdKesRate(data.usd_kes);
      }
    } catch (err) {
      console.warn('Could not refresh exchange rate:', err);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRate();
  }, [refreshRate]);

  // Sync saved cars to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('japan_imports_saved_cars', JSON.stringify(savedCars));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
  }, [savedCars]);

  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'info' | 'warning' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSaveCar = useCallback(
    (car: CarListing) => {
      setSavedCars((prev) => {
        const exists = prev.some((c) => c.id === car.id);
        if (exists) {
          showToast('Removed from Watchlist', `${car.year} ${car.make} ${car.model}`, 'info');
          return prev.filter((c) => c.id !== car.id);
        } else {
          showToast('Added to Watchlist', `${car.year} ${car.make} ${car.model}`, 'success');
          return [...prev, car];
        }
      });
    },
    [showToast]
  );

  const clearSavedCars = useCallback(() => {
    setSavedCars([]);
    showToast('Watchlist Cleared', 'All saved vehicles removed', 'info');
  }, [showToast]);

  const isCarSaved = useCallback(
    (id: number) => {
      return savedCars.some((c) => c.id === id);
    },
    [savedCars]
  );

  const addToCompare = useCallback(
    (car: CarListing) => {
      if (comparisonCars.some((c) => c.id === car.id)) {
        setComparisonCars((prev) => prev.filter((c) => c.id !== car.id));
        showToast('Removed from Comparison', `${car.year} ${car.make} ${car.model}`, 'info');
        return false;
      }
      if (comparisonCars.length >= 4) {
        showToast('Comparison limit reached', 'You can compare up to 4 vehicles simultaneously', 'warning');
        return false;
      }
      setComparisonCars((prev) => [...prev, car]);
      showToast('Added to Comparison', `${car.year} ${car.make} ${car.model}`, 'success');
      return true;
    },
    [comparisonCars, showToast]
  );

  const removeFromCompare = useCallback((id: number) => {
    setComparisonCars((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setComparisonCars([]);
  }, []);

  const isComparing = useCallback(
    (id: number) => {
      return comparisonCars.some((c) => c.id === id);
    },
    [comparisonCars]
  );

  const openDutyModal = useCallback((car: CarListing) => {
    setSelectedCarForDutyModal(car);
  }, []);

  const closeDutyModal = useCallback(() => {
    setSelectedCarForDutyModal(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        usdKesRate,
        rateLoading,
        currencyMode,
        setCurrencyMode,
        refreshRate,
        savedCarIds,
        savedCars,
        toggleSaveCar,
        clearSavedCars,
        isCarSaved,
        comparisonCars,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isComparing,
        selectedCarForDutyModal,
        openDutyModal,
        closeDutyModal,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
