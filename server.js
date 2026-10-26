import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import analyzeHandler, { getAnalysisProgress } from "./api/analyze.js";
import stateHandler from "./api/state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/analyze", analyzeHandler);
app.get("/api/analyze/progress", (req, res) => res.json(getAnalysisProgress()));
app.get("/api/state", stateHandler);
app.post("/api/state", stateHandler);

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`TriageDesk server running at http://localhost:${PORT}`);
  });
}

export default app;
