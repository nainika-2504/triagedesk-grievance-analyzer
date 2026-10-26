import { analyzeComplaints } from "../lib/analysis.js";

export const access = "public";
export const methods = ["POST"];

let progress = { current: 0, total: 0, stage: "idle", text: "" };

export function getAnalysisProgress() {
  return progress;
}

export default async function (req, res) {
  const incoming = req.body?.complaints;
  const workspace = req.body?.workspace;
  if (!Array.isArray(incoming) || incoming.length > 200) {
    return res.status(400).json({ error: "Provide up to 200 synthetic complaints." });
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

  progress = { current: 0, total: clean.length, stage: "starting", text: `Analysing 0 of ${clean.length}` };

  try {
    const result = await analyzeComplaints(clean, workspace, (p) => {
      progress = p;
    });
    progress = { current: clean.length, total: clean.length, stage: "done", text: "" };
    return res.json(result);
  } catch (e) {
    progress = { current: 0, total: 0, stage: "error", text: "" };
    return res.status(500).json({ error: "Analysis failed", detail: String(e?.message || e) });
  }
}