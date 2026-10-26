import { PROMPTS } from "./prompts.js";
import { normalizeUrgency } from "./rules.js";
import { getProfile } from "./profiles.js";

let jsonModeSupported = true;

export function parseJson(s) {
  const str = String(s || "").trim();
  const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {}
  }
  try {
    return JSON.parse(str);
  } catch (e) {}
  const match = str.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      const blocks = str.match(/\{[^{}]*\}/g);
      if (blocks) {
        for (const b of blocks.reverse()) {
          try { return JSON.parse(b); } catch (_) {}
        }
      }
    }
  }
  const a = str.indexOf("{");
  const b = str.lastIndexOf("}");
  if (a >= 0 && b > a) {
    return JSON.parse(str.slice(a, b + 1));
  }
  throw new Error("Invalid JSON from model");
}

function mock(schemaName, prompt, profile) {
  const full = String(prompt || "").toLowerCase();
  const p = schemaName === "complaint" ? (full.split("complaint:").pop() || full).trim() : full;
  const workspace = getProfile(profile);
  const depts = workspace.departments.map(d => d.name);

  if (schemaName === "pair") {
    const a = p.split("a:")[1]?.split("b:")[0] || "";
    const b = p.split("b:")[1] || "";
    const aa = new Set(a.match(/[a-z]{4,}/g) || []);
    const bb = new Set(b.match(/[a-z]{4,}/g) || []);
    const common = [...aa].filter(x => bb.has(x)).length;
    return {
      same_problem: common >= 2,
      reason: common >= 2
        ? "Several meaningful issue terms overlap in this mock comparison."
        : "The available wording does not establish the same underlying problem."
    };
  }

  if (schemaName === "case") {
    const requested = p.split("category:")[1]?.split(".")[0]?.trim();
    const department = depts.find(d => d.toLowerCase() === requested?.toLowerCase()) || "Unassigned";
    return {
      department,
      next_action: "Ask the responsible team to verify the report and provide an update.",
      draft_reply: "Thank you for reporting this issue. The team will review it and determine the next steps.",
      confidence: department === "Unassigned" ? 0.2 : 0.42
    };
  }

  const hints = [
    { words: ["water", "tap", "supply", "drinking"], keys: ["water", "supply", "tap", "droplet"] },
    { words: ["food", "meal", "kitchen", "canteen", "mess"], keys: ["food", "meal", "dining", "kitchen"] },
    { words: ["exam", "marks", "class", "course", "attendance"], keys: ["academic", "exam", "course", "teaching", "records"] },
    { words: ["wifi", "internet", "network", "portal", "login", "computer", "app"], keys: ["network", "wifi", "system", "digital", "technical", "connectivity", "internet"] },
    { words: ["bus", "shuttle", "route", "driver", "transport"], keys: ["transport", "bus", "route", "field operations"] },
    { words: ["fire", "threat", "unsafe", "harassment", "ragging", "shock", "sparks", "sparking", "burning", "chemical", "cable", "spill", "injury", "emergency", "overflow"], keys: ["safety", "security", "compliance", "public safety"] },
    { words: ["medical", "ambulance", "clinic", "fever", "injury", "bleeding"], keys: ["health", "medical", "public health"] },
    { words: ["bill", "invoice", "payment", "tax", "charge", "receipt"], keys: ["billing", "tax", "revenue", "invoice", "payment", "receipt"] },
    { words: ["waste", "garbage", "trash", "recycle", "sanitation"], keys: ["waste", "sanitation", "recycle", "cleaning"] },
    { words: ["road", "pothole", "streetlight", "pavement"], keys: ["road", "streetlight", "street", "infrastructure"] },
    { words: ["drain", "sewage", "flood", "overflow"], keys: ["drain", "sewage", "drainage"] },
    { words: ["book", "library", "borrow", "reading"], keys: ["library", "book", "study"] },
    { words: ["install", "setup", "technician", "visit", "repair"], keys: ["install", "field", "maintenance", "repair", "operation"] }
  ];

  let best = 0;
  let category = "Unassigned";
  for (const d of workspace.departments) {
    const desc = (d.name + " " + d.description).toLowerCase();
    const words = desc.split(/[^a-z0-9]+/).filter(x => x.length > 3 && !["public", "general", "service", "services", "request", "requests", "issue", "issues", "and", "with", "from", "this", "that", "team", "support", "concerns", "concern", "reports", "report", "your", "their"].includes(x));
    let score = 0;
    for (const word of words) if (p.includes(word)) score += 2;
    for (const hint of hints) if (hint.words.some(word => p.includes(word)) && hint.keys.some(key => desc.includes(key))) score += 3;
    if (score > best) {
      best = score;
      category = d.name;
    }
  }
  if (best === 0) category = "Unassigned";

  const urgency = /fire|gas leak|shock|harass|ragging|ambulance|threat|stuck in lift|short circuit|injury|unsafe|smoke|sparks|spill|overflow/.test(p)
    ? "high"
    : /urgent|immediately|emergency/.test(p)
    ? "high"
    : /broken|not working|no water|no wifi|problem|issue|leak/.test(p)
    ? "medium"
    : "low";

  const language = /[\u0C00-\u0C7F]/.test(p)
    ? (/[\u0900-\u097F]/.test(p) ? "mixed" : "te")
    : /[\u0900-\u097F]/.test(p)
    ? "hi"
    : /\b(anna|ledu|undhi|kavali|hai|nahi|chahiye)\b/.test(p)
    ? "mixed"
    : "en";

  const topic = /water|tap|supply|पानी/.test(p) ? "water supply"
    : /fan/.test(p) ? "fan repair"
    : /leak/.test(p) ? "leak repair"
    : /wifi|internet|network/.test(p) ? "network connectivity"
    : /portal|login/.test(p) ? "portal access"
    : /bus|shuttle/.test(p) ? "transport service"
    : /food|meal|mess/.test(p) ? "food quality"
    : /tax|bill|invoice/.test(p) ? "billing query"
    : /road|pothole/.test(p) ? "road repair"
    : /sewage|drain/.test(p) ? "drainage concern"
    : /gas leak|fire|smoke|short circuit|electric shock|sparks/.test(p) ? "urgent safety hazard"
    : "service request";

  return {
    category,
    issue: category + " — " + topic,
    urgency,
    urgency_reason: urgency === "high"
      ? "The text indicates a potentially time-sensitive service or safety concern."
      : "Priority estimated from the wording and reported impact.",
    language,
    confidence: category === "Unassigned" ? 0.25 : 0.51
  };
}

async function executeGeminiRequest(model, key, prompt, useJsonMode) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const generationConfig = { temperature: 0.1 };
  if (useJsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: "Return only valid JSON. No markdown. " + prompt }
        ]
      }
    ],
    generationConfig
  };

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000)
  });
}

export async function callModel(prompt, schemaName, profile) {
  const workspace = getProfile(profile);
  const names = workspace.departments.map(d => d.name);

  try {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("GEMINI_API_KEY missing");

    const model = process.env.GEMMA_MODEL?.trim();
    if (!model) throw new Error("GEMMA_MODEL missing");

    let response = null;
    let attempts = 0;
    const maxRetries = 3;

    while (attempts <= maxRetries) {
      try {
        response = await executeGeminiRequest(model, key, prompt, jsonModeSupported);

        // If JSON mode failed with 4xx error (e.g. 400 Bad Request regarding responseMimeType), retry without JSON mode
        if (!response.ok && response.status >= 400 && response.status < 500 && jsonModeSupported) {
          const errText = await response.clone().text().catch(() => "");
          if (response.status === 400 || /responseMimeType|generationConfig/i.test(errText)) {
            jsonModeSupported = false;
            response = await executeGeminiRequest(model, key, prompt, false);
          }
        }

        // Retry on 429 and 5xx with exponential backoff
        if (response.status === 429 || response.status >= 500) {
          if (attempts < maxRetries) {
            attempts++;
            const backoffMs = Math.min(1000 * Math.pow(2, attempts) + Math.random() * 250, 6000);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
        }
        break;
      } catch (networkErr) {
        if (attempts < maxRetries) {
          attempts++;
          const backoffMs = Math.min(1000 * Math.pow(2, attempts) + Math.random() * 250, 6000);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        throw networkErr;
      }
    }

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("") || "";
    const value = parseJson(raw);

    if (schemaName === "complaint") {
      if (
        !["critical", "high", "medium", "low"].includes(value.urgency) ||
        !["en", "te", "hi", "mixed"].includes(value.language) ||
        typeof value.issue !== "string" ||
        typeof value.urgency_reason !== "string" ||
        !(Number(value.confidence) >= 0 && Number(value.confidence) <= 1)
      ) {
        throw new Error("Schema validation failed on complaint");
      }
      const valid = names.includes(value.category);
      const confidence = valid ? Number(value.confidence) : Math.min(Number(value.confidence) || 0.2, 0.25);
      return {
        ...value,
        category: valid ? value.category : "Unassigned",
        confidence,
        needsReview: !valid,
        _mock: false,
        _mode: "real"
      };
    }

    if (schemaName === "pair") {
      if (typeof value.same_problem === "boolean" && typeof value.reason === "string") {
        return { ...value, _mock: false, _mode: "real" };
      }
      throw new Error("Schema validation failed on pair");
    }

    if (schemaName === "case") {
      if (
        typeof value.next_action === "string" &&
        typeof value.draft_reply === "string" &&
        Number(value.confidence) >= 0 &&
        Number(value.confidence) <= 1
      ) {
        const valid = names.includes(value.department);
        const confidence = valid ? Number(value.confidence) : Math.min(Number(value.confidence) || 0.2, 0.25);
        return {
          ...value,
          department: valid ? value.department : "Unassigned",
          confidence,
          needsReview: !valid,
          _mock: false,
          _mode: "real"
        };
      }
      throw new Error("Schema validation failed on case");
    }

    throw new Error("Unknown schemaName or schema validation failed");
  } catch (e) {
    const value = mock(schemaName, prompt, workspace);
    const reason = String(e?.message || "Model unavailable").slice(0, 100);
    if (schemaName === "complaint" && !names.includes(value.category)) {
      return { ...value, category: "Unassigned", confidence: 0.2, needsReview: true, _mock: true, _mode: "mock", _reason: reason };
    }
    if (schemaName === "case" && !names.includes(value.department)) {
      return { ...value, department: "Unassigned", confidence: 0.2, needsReview: true, _mock: true, _mode: "mock", _reason: reason };
    }
    return { ...value, _mock: true, _mode: "mock", _reason: reason };
  }
}

export { PROMPTS };