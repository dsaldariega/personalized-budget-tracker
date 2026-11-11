import "dotenv/config";
import app from "./server.js";

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`BudgetNest API listening on http://localhost:${port}`);
});
