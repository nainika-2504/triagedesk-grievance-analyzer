#!/usr/bin/env node
/**
 * npm run check-model
 * Makes one real call per prompt type with a sample Telugu, Hindi, and English complaint.
 * Prints HTTP status, raw response text, whether it parsed, and whether it passed validation.
 * Concludes with "REAL MODEL OK" or "FELL BACK TO MOCK because: ..."
 */
import "dotenv/config";
import { callModel, parseJson } from "../lib/callModel.js";
import { PROMPTS } from "../lib/prompts.js";
import { getProfile } from "../lib/profiles.js";

const SAMPLE_COMPLAINTS = [
  {
    lang: "English",
    text: "There has been no water in the hostel since last night. Please fix the supply urgently.",
  },
  {
    lang: "Hindi",
    text: "हमारे हॉस्टल में कल से पानी नहीं आ रहा है। कृपया जल्दी सुधार करें।",
  },
  {
    lang: "Telugu",
    text: "హాస్టల్‌లో నిన్నటి నుండి నీళ్ళు రావడం లేదు. దయచేసి వెంటనే పరిష్కరించండి.",
  },
];

const profile = getProfile("campus");
const departments = profile.departments;

const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMMA_MODEL?.trim();

console.log("\n========== TriageDesk check-model ==========\n");

if (!key) {
  console.log("❌  GEMINI_API_KEY is not set in .env");
  console.log("    FELL BACK TO MOCK because: GEMINI_API_KEY missing\n");
  process.exit(0);
}

if (!model) {
  console.log("❌  GEMMA_MODEL is not set in .env");
  console.log("    Running in mock mode. Set GEMMA_MODEL from mlh.link/gemma and retry.");
  console.log("    FELL BACK TO MOCK because: GEMMA_MODEL missing\n");
  process.exit(0);
}

console.log(`Model:     ${model}`);
console.log(`Key set:   yes (${key.length} chars, starts with ${key.slice(0, 4)}...)`);
console.log("");

async function directFetch(prompt, useJsonMode) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const generationConfig = { temperature: 0.1 };
  if (useJsonMode) generationConfig.responseMimeType = "application/json";

  const body = {
    contents: [{ parts: [{ text: "Return only valid JSON. No markdown. " + prompt }] }],
    generationConfig,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
}

let allPassed = true;
const failures = [];

// ---- Complaint prompt checks ----
console.log("--- Prompt type: complaint (one per language) ---\n");

for (const sample of SAMPLE_COMPLAINTS) {
  const prompt = PROMPTS.complaint({
    text: sample.text,
    departments,
    organisationType: profile.terms.organisationType,
    itemName: profile.terms.itemName,
  });

  process.stdout.write(`[${sample.lang}] Calling API...`);
  let status, rawText, parsed, valid, useJsonMode = true;

  try {
    let resp = await directFetch(prompt, true);
    status = resp.status;

    // If JSON mode rejected, retry without it
    if (!resp.ok && (resp.status === 400 || resp.status === 422)) {
      const errBody = await resp.text().catch(() => "");
      if (/responseMimeType|generationConfig/i.test(errBody) || resp.status === 400) {
        process.stdout.write(` (JSON mode rejected, retrying without)...`);
        resp = await directFetch(prompt, false);
        status = resp.status;
        useJsonMode = false;
      }
    }

    console.log(` HTTP ${status}`);

    if (resp.ok) {
      const data = await resp.json();
      rawText = data.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("") || "";
      console.log(`  Raw response (first 400 chars): ${rawText.slice(0, 400)}`);
      console.log(`  JSON mode used: ${useJsonMode}`);

      try {
        parsed = parseJson(rawText);
        const hasUrgency = ["critical", "high", "medium", "low"].includes(parsed.urgency);
        const hasLanguage = ["en", "te", "hi", "mixed"].includes(parsed.language);
        const hasIssue = typeof parsed.issue === "string";
        const hasConfidence = typeof parsed.confidence === "number";
        valid = hasUrgency && hasLanguage && hasIssue && hasConfidence;
        console.log(`  Parsed: ✓  Urgency: ${parsed.urgency}  Language: ${parsed.language}  Category: ${parsed.category}`);
        console.log(`  Validation: ${valid ? "✓ PASSED" : "✗ FAILED (missing fields)"}`);
        if (!valid) {
          allPassed = false;
          failures.push(`complaint/${sample.lang}: schema validation failed`);
        }
      } catch (parseErr) {
        console.log(`  Parsed: ✗  ${parseErr.message}`);
        allPassed = false;
        failures.push(`complaint/${sample.lang}: JSON parse failed — ${parseErr.message}`);
      }
    } else {
      const errBody = await resp.text().catch(() => "(no body)");
      console.log(`  Error body: ${errBody.slice(0, 300)}`);
      allPassed = false;
      failures.push(`complaint/${sample.lang}: HTTP ${status}`);
    }
  } catch (err) {
    console.log(` ERROR: ${err.message}`);
    allPassed = false;
    failures.push(`complaint/${sample.lang}: ${err.message}`);
  }
  console.log("");
}

// ---- Pair prompt check ----
console.log("--- Prompt type: pair ---\n");
const pairPrompt = PROMPTS.pair(
  "Hostel water supply stopped completely since last night",
  "No running water in hostel bathrooms since yesterday"
);
process.stdout.write(`[pair] Calling API...`);

try {
  let resp = await directFetch(pairPrompt, true);
  let status = resp.status;
  let useJsonMode = true;

  if (!resp.ok && (resp.status === 400 || resp.status === 422)) {
    const errBody = await resp.text().catch(() => "");
    if (/responseMimeType|generationConfig/i.test(errBody) || resp.status === 400) {
      resp = await directFetch(pairPrompt, false);
      status = resp.status;
      useJsonMode = false;
    }
  }

  console.log(` HTTP ${status}`);

  if (resp.ok) {
    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("") || "";
    console.log(`  Raw (first 200 chars): ${rawText.slice(0, 200)}`);
    try {
      const parsed = parseJson(rawText);
      const valid = typeof parsed.same_problem === "boolean" && typeof parsed.reason === "string";
      console.log(`  same_problem: ${parsed.same_problem}  reason: ${String(parsed.reason).slice(0, 80)}`);
      console.log(`  Validation: ${valid ? "✓ PASSED" : "✗ FAILED"}`);
      if (!valid) { allPassed = false; failures.push("pair: schema validation failed"); }
    } catch (e) {
      console.log(`  Parsed: ✗  ${e.message}`);
      allPassed = false;
      failures.push(`pair: JSON parse failed`);
    }
  } else {
    allPassed = false;
    failures.push(`pair: HTTP ${status}`);
  }
} catch (err) {
  console.log(` ERROR: ${err.message}`);
  allPassed = false;
  failures.push(`pair: ${err.message}`);
}
console.log("");

// ---- Case prompt check ----
console.log("--- Prompt type: case ---\n");
const casePrompt = PROMPTS.case({
  issues: ["Hostel water supply stopped", "No water in bathroom taps"],
  category: "Hostel",
  languages: ["en"],
  departments,
  organisationType: profile.terms.organisationType,
  itemName: profile.terms.itemName,
});
process.stdout.write(`[case] Calling API...`);

try {
  let resp = await directFetch(casePrompt, true);
  let status = resp.status;
  let useJsonMode = true;

  if (!resp.ok && (resp.status === 400 || resp.status === 422)) {
    const errBody = await resp.text().catch(() => "");
    if (/responseMimeType|generationConfig/i.test(errBody) || resp.status === 400) {
      resp = await directFetch(casePrompt, false);
      status = resp.status;
      useJsonMode = false;
    }
  }

  console.log(` HTTP ${status}`);

  if (resp.ok) {
    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("") || "";
    console.log(`  Raw (first 200 chars): ${rawText.slice(0, 200)}`);
    try {
      const parsed = parseJson(rawText);
      const valid = typeof parsed.next_action === "string" &&
        typeof parsed.draft_reply === "string" &&
        typeof parsed.confidence === "number";
      console.log(`  department: ${parsed.department}  confidence: ${parsed.confidence}`);
      console.log(`  Validation: ${valid ? "✓ PASSED" : "✗ FAILED"}`);
      if (!valid) { allPassed = false; failures.push("case: schema validation failed"); }
    } catch (e) {
      console.log(`  Parsed: ✗  ${e.message}`);
      allPassed = false;
      failures.push(`case: JSON parse failed`);
    }
  } else {
    allPassed = false;
    failures.push(`case: HTTP ${status}`);
  }
} catch (err) {
  console.log(` ERROR: ${err.message}`);
  allPassed = false;
  failures.push(`case: ${err.message}`);
}
console.log("");

// ---- Final result ----
console.log("============================================");
if (allPassed) {
  console.log("✅  REAL MODEL OK");
  console.log(`    All prompt types responded and passed schema validation.`);
  console.log(`    Model: ${model}`);
} else {
  console.log("❌  FELL BACK TO MOCK because:");
  for (const f of failures) console.log(`    — ${f}`);
  console.log("\n    The app will still work in mock mode.");
  console.log("    Set GEMMA_MODEL correctly from mlh.link/gemma and ensure the API key is valid.");
}
console.log("============================================\n");
