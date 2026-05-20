import api from "./client";

export const fetchListings = async (params) => {
  const res = await api.get("/api/listings/", { params });
  return {
    data:  res.data,
    total: parseInt(res.headers["x-total-count"] || "0", 10),
  };
};

export const fetchListing   = (id)   => api.get(`/api/listings/${id}`).then(r => r.data);
export const fetchMakes     = ()     => api.get("/api/listings/meta/makes").then(r => r.data);
export const fetchModels    = (make) => api.get("/api/listings/meta/models", { params: { make } }).then(r => r.data);
