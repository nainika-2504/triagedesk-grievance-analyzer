import { analyzeComplaints } from "../lib/analysis.js";

export const access = "public";
export const methods = ["POST"];

const runs = new Map();

export function getAnalysisProgress(runId) {
  if (runId && runs.has(runId)) {
    return runs.get(runId);
  }
  // Return the most recently updated active run
  const all = Array.from(runs.values());
  const active = all.filter(p => p.stage !== "done" && p.stage !== "error");
  if (active.length) {
    return active[active.length - 1];
  }
  if (all.length) {
    return all[all.length - 1];
  }
  return { current: 0, total: 0, stage: "idle", text: "" };
}

export default async function (req, res) {
  const incoming = req.body?.complaints;
  const workspace = req.body?.workspace;
  const runId = String(req.body?.runId || "run_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7));

  if (!Array.isArray(incoming) || incoming.length > 200) {
    return res.status(400).json({ error: "Provide up to 200 complaints." });
  }
  const clean = [];
  for (let i = 0; i < incoming.length; i++) {
    const c = incoming[i];
    if (!c || typeof c.text !== "string" || !c.text.trim()) continue;
    clean.push({
      id: String(c.id || "CMP-" + (i + 1)).slice(0, 60),
      text: c.text.slice(0, 4000),
      language: String(c.language || "").slice(0, 12),
      status: "Analyzed"
    });
  }
  if (!clean.length) return res.status(400).json({ error: "No non-empty complaint text found." });

  runs.set(runId, { runId, current: 0, total: clean.length, stage: "starting", stageNum: 1, text: `Starting analysis of ${clean.length} complaints…` });

  try {
    const result = await analyzeComplaints(clean, workspace, (p) => {
      runs.set(runId, { runId, ...p });
    });
    runs.set(runId, { runId, current: 1, total: 1, stage: "done", stageNum: 3, text: "Analysis complete!" });
    setTimeout(() => runs.delete(runId), 600000);
    return res.json(result);
  } catch (e) {
    runs.set(runId, { runId, current: 0, total: clean.length, stage: "error", text: "" });
    setTimeout(() => runs.delete(runId), 60000);
    return res.status(500).json({ error: "Analysis failed", detail: String(e?.message || e) });
  }
}