import api from "./client";

export const getOverview          = () => api.get("/api/stats/overview").then(r => r.data);
export const getPriceDistribution = () => api.get("/api/stats/price-distribution").then(r => r.data);
export const getTopMakes          = () => api.get("/api/stats/top-makes").then(r => r.data);
export const getSavingsSummary    = () => api.get("/api/stats/savings-summary").then(r => r.data);
