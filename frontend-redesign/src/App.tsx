import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
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
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-[#0E402D] selection:text-[#9FCC2E]">
          <Navbar />
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
