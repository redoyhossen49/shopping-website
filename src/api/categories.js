import { api } from "./client.js";

export const listCategories = () => api.get("/categories");
