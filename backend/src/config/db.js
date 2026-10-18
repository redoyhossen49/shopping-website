import pg from "pg";
import { getDatabaseConfig } from "./database.js";

const { Pool } = pg;

export const pool = new Pool(getDatabaseConfig());