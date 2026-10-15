import express from "express";
import { getProducts, getProductByIdController } from "../controllers/products.controller.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductByIdController);

export default router;
