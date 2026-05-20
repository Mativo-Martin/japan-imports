import api from "./client";

export const estimateImport = (body) =>
  api.post("/api/calculator/estimate", body).then(r => r.data);

export const compareImportVsLocal = (make, model, year) =>
  api.get("/api/calculator/compare", { params: { make, model, year } }).then(r => r.data);

export const getExchangeRate = () =>
  api.get("/api/calculator/exchange-rate").then(r => r.data);
