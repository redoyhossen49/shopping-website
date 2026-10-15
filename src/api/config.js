import { api } from "./client.js";

export const getAppConfig = () => api.get("/config");
