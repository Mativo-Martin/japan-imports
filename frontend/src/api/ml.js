import api from "./client";

export const predictPrice = (body) =>
  api.post("/api/ml/predict", body).then(r => r.data);

export const predictWithImport = (body) =>
  api.post("/api/ml/predict-with-import", body).then(r => r.data);

export const getModelInfo = () =>
  api.get("/api/ml/model-info").then(r => r.data);
