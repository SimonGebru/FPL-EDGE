import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5060;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});