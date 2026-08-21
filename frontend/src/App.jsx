import { Routes, Route } from "react-router-dom";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";
import Layout       from "./components/Layout";
import Dashboard    from "./pages/Dashboard";
import Search       from "./pages/Search";
import ListingDetail from "./pages/ListingDetail";
import Calculator   from "./pages/Calculator";
import Predictor    from "./pages/Predictor";
import Compare from "./pages/Compare";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index              element={<Dashboard />}     />
        <Route path="search"      element={<Search />}        />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="calculator"  element={<Calculator />}    />
        <Route path="predictor"   element={<Predictor />}     />
        <Route path="compare"     element={<Compare />}       />
      </Route>
    </Routes>
  );
}
