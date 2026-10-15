import express from "express";
import { listCategoriesController } from "../controllers/categories.controller.js";

const router = express.Router();

router.get("/", listCategoriesController);

export default router;
