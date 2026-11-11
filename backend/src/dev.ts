import dotenv from "dotenv";
import app from "./server.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`BudgetNest API listening on http://localhost:${port}`);
});
