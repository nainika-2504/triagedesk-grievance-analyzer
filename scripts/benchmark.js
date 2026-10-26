import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeComplaints } from "../lib/analysis.js";
import { PRESETS } from "../lib/profiles.js";
import { getState, putState } from "../lib/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_PATH = path.join(__dirname, "..", "data", "benchmark-labeled.json");

function urgencyRank(u) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[String(u || "").toLowerCase()] || 0;
}

function pairSet(groups) {
  const s = new Set();
  const list = groups instanceof Map ? Array.from(groups.values()) : Object.values(groups);
  for (const g of list) {
    if (!Array.isArray(g)) continue;
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        s.add([g[i], g[j]].sort().join(" | "));
      }
    }
  }
  return s;
}

async function runCliBenchmark() {
  console.log("==========================================================");
  console.log(" TriageDesk — Benchmark Evaluation Pipeline");
  console.log("==========================================================");

  let raw;
  try {
    raw = await fs.readFile(BENCHMARK_PATH, "utf8");
  } catch (e) {
    console.error(`[ERROR] Failed to load benchmark dataset at ${BENCHMARK_PATH}: ${e.message}`);
    process.exit(1);
  }

  const labeled = JSON.parse(raw);
  console.log(`Loaded ${labeled.length} labeled synthetic complaints from data/benchmark-labeled.json\n`);

  console.log(`Model mode: ${process.env.GEMINI_API_KEY ? "GEMMA (live API configured)" : "MOCK (deterministic fallback)"}`);
  if (process.env.GEMINI_API_KEY) {
    console.log(`Configured model: ${process.env.GEMMA_MODEL || "gemma-3-12b-it"}`);
  }
  console.log(`Concurrency: ${process.env.MODEL_CONCURRENCY || 3}\n`);

  const startTime = Date.now();
  let lastProgressText = "";

  const onProgress = (p) => {
    if (p && p.text && p.text !== lastProgressText) {
      lastProgressText = p.text;
      process.stdout.write(`\r[Progress] ${p.text.padEnd(50)}`);
    }
  };

  const complaintsInput = labeled.map(c => ({
    id: c.id,
    text: c.text,
    language: c.language
  }));

  const analysisResult = await analyzeComplaints(complaintsInput, PRESETS.campus, onProgress);
  process.stdout.write("\r" + " ".repeat(60) + "\r");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Analysis complete in ${elapsed}s.\n`);

  const predicted = new Map(analysisResult.complaints.map(c => [c.id, c]));
  let depMatches = 0;
  let urgMatches = 0;
  let safetyTotal = 0;
  let safetyHits = 0;

  for (const row of labeled) {
    const p = predicted.get(row.id);
    if (!p) continue;

    const trueDept = row.true_department || row.trueDepartment;
    const trueUrg = row.true_urgency || row.trueUrgency;

    if (p.category === trueDept) depMatches++;
    if (p.urgency === trueUrg) urgMatches++;

    if (trueUrg === "high" || trueUrg === "critical") {
      safetyTotal++;
      if (p.safetyRaised && urgencyRank(p.urgency) >= 3) {
        safetyHits++;
      }
    }
  }

  // Duplicate grouping metrics (pairwise TP / FP / FN)
  const truthGroups = new Map();
  labeled.forEach(row => {
    const caseId = row.true_case_id || row.trueCase;
    if (!truthGroups.has(caseId)) truthGroups.set(caseId, []);
    truthGroups.get(caseId).push(row.id);
  });
  const truthPairs = pairSet(truthGroups);

  const predGroups = {};
  analysisResult.cases.forEach(c => {
    predGroups[c.id] = c.complaints.map(x => x.id);
  });
  const predPairs = pairSet(predGroups);

  let tp = 0;
  predPairs.forEach(pair => {
    if (truthPairs.has(pair)) tp++;
  });

  const departmentAccuracy = +(depMatches / labeled.length * 100).toFixed(1);
  const urgencyAgreement = +(urgMatches / labeled.length * 100).toFixed(1);
  const safetyRecall = +(safetyTotal ? safetyHits / safetyTotal * 100 : 100).toFixed(1);
  const duplicatePrecision = +(predPairs.size ? tp / predPairs.size * 100 : 0).toFixed(1);
  const duplicateRecall = +(truthPairs.size ? tp / truthPairs.size * 100 : 0).toFixed(1);

  const modeStr = analysisResult.aiMode === "real" ? "Gemma (Real API)"
    : analysisResult.aiMode === "partial" ? "Partial (Some Mock Fallback)"
    : "MOCK (Deterministic Demo Logic)";

  console.log("----------------------------------------------------------");
  console.log(" BENCHMARK RESULTS SUMMARY");
  console.log("----------------------------------------------------------");
  console.log(` AI Mode               : ${modeStr}`);
  console.log(` Total Complaints      : ${labeled.length}`);
  console.log(` Generated Cases       : ${analysisResult.cases.length}`);
  console.log(` Department Accuracy   : ${departmentAccuracy}% (${depMatches}/${labeled.length})`);
  console.log(` Urgency Agreement     : ${urgencyAgreement}% (${urgMatches}/${labeled.length})`);
  console.log(` Safety Floor Recall   : ${safetyRecall}% (${safetyHits}/${safetyTotal} critical/high safety raised)`);
  console.log(` Duplicate Precision   : ${duplicatePrecision}% (${tp}/${predPairs.size} predicted pairs matched)`);
  console.log(` Duplicate Recall      : ${duplicateRecall}% (${tp}/${truthPairs.size} truth pairs captured)`);
  console.log("----------------------------------------------------------\n");

  // Save to state.json so in-app insights reflects this benchmark run
  try {
    const currentState = await getState();
    const benchmarkHistory = currentState.benchmark || [];
    const newEntry = {
      at: new Date().toISOString(),
      mode: analysisResult.aiMode === "real" ? "Gemma" : analysisResult.aiMode === "partial" ? "Partial" : "MOCK",
      departmentAccuracy,
      urgencyAgreement,
      safetyRecall,
      duplicatePrecision,
      duplicateRecall
    };
    benchmarkHistory.push(newEntry);
    await putState("benchmark", benchmarkHistory);
    await putState("aiMocked", analysisResult.mocked);
    await putState("aiMode", analysisResult.aiMode || (analysisResult.mocked ? "mock" : "real"));
    await putState("aiSummary", analysisResult.aiSummary || modeStr);
    await putState("aiFallbackReason", analysisResult.aiFallbackReason || "");
    console.log("[OK] Benchmark entry recorded in data/state.json for in-app display.");
  } catch (e) {
    console.warn(`[WARN] Could not update state.json: ${e.message}`);
  }

  console.log("\nBenchmark complete.");
}

runCliBenchmark().catch(err => {
  console.error("[FATAL] Benchmark crashed:", err);
  process.exit(1);
});
