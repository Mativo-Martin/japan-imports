import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { DutyBreakdownModal } from './components/DutyBreakdownModal';
import { CompareFloatingBar } from './components/CompareFloatingBar';
import { ToastContainer } from './components/Toast';

import { Dashboard } from './pages/Dashboard';
import { Search } from './pages/Search';
import { ListingDetail } from './pages/ListingDetail';
import { Calculator } from './pages/Calculator';
import { Compare } from './pages/Compare';
import { Predictor } from './pages/Predictor';
import { SavedListings } from './pages/SavedListings';

export const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-[#FFFFFF] text-[#000000] flex flex-col lg:flex-row font-sans selection:bg-[#000000] selection:text-[#6BD425]">
          {/* Main Sidebar */}
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

          {/* Right Content Area */}
          <div className="flex-1 min-w-0 flex flex-col min-h-screen">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/marketplace" element={<Search />} />
                <Route path="/listings/:id" element={<ListingDetail />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/predictor" element={<Predictor />} />
                <Route path="/watchlist" element={<SavedListings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>

          {/* Global Modals & Floating Docks */}
          <DutyBreakdownModal />
          <CompareFloatingBar />
          <ToastContainer />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
