import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
