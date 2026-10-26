import { callModel } from "./callModel.js";
import { PROMPTS } from "./prompts.js";
import { maskPersonalDetails } from "./masking.js";
import { floorUrgency, normalizeUrgency } from "./rules.js";
import { similarityMatrix } from "./similarity.js";
import { getProfile } from "./profiles.js";
import { createLimiter } from "./concurrency.js";

export async function analyzeComplaints(complaints, activeProfile, onProgress) {
  const profile = getProfile(activeProfile);
  const departments = profile.departments;
  const concurrency = parseInt(process.env.MODEL_CONCURRENCY, 10) || 3;
  const limit = createLimiter(concurrency);

  const callResults = [];
  const recordCall = (res) => {
    if (res) callResults.push(res);
  };

  let completedComplaints = 0;
  const totalInput = complaints.length;

  onProgress?.({
    current: 0,
    total: totalInput,
    stage: "complaints",
    stageNum: 1,
    text: `Stage 1 of 3: Analysing 0 of ${totalInput} complaints`
  });

  // Stage 1: Per-complaint analysis with concurrency limiter
  const complaintTasks = complaints.map(c => limit(async () => {
    const masked = maskPersonalDetails(c.text);
    const prompt = PROMPTS.complaint({
      text: masked,
      departments,
      organisationType: profile.terms.organisationType,
      itemName: profile.terms.itemName
    });
    const a = await callModel(prompt, "complaint", profile);
    recordCall(a);
    completedComplaints++;

    onProgress?.({
      current: completedComplaints,
      total: totalInput,
      stage: "complaints",
      stageNum: 1,
      text: `Stage 1 of 3: Analysing ${completedComplaints} of ${totalInput} complaints`
    });

    const floor = floorUrgency(normalizeUrgency(a.urgency), masked, profile);
    const valid = departments.some(d => d.name === a.category);

    return {
      ...c,
      maskedText: masked,
      category: valid ? a.category : "Unassigned",
      issue: a.issue || "Unclear service request",
      urgency: floor.urgency,
      urgency_reason: a.urgency_reason || "Priority requires human assessment.",
      language: ["en", "te", "hi", "mixed"].includes(a.language) ? a.language : "en",
      confidence: valid ? (a.confidence ?? 0.5) : Math.min(a.confidence ?? 0.2, 0.25),
      needsReview: !valid || !!a.needsReview,
      departmentFlag: !valid ? "Unassigned department requires human review" : undefined,
      safetyRaised: floor.raised,
      analysisMocked: !!a._mock
    };
  }));

  const results = await Promise.all(complaintTasks);

  onProgress?.({
    current: 0,
    total: 1,
    stage: "grouping",
    stageNum: 2,
    text: `Stage 2 of 3: Grouping duplicates & finding related issues…`
  });

  // Stage 2: Similarity and Union-Find grouping with pair cache
  const stopwords = profile.similarityStopwords;
  const matrix = similarityMatrix(results, stopwords);
  const n = results.length;
  const parent = results.map((_, i) => i);
  const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  };

  const pairCache = new Map();
  const getPairKey = (issA, issB) => [String(issA || ""), String(issB || "")].sort().join(" ::: ");

  // Identify all borderline pairs that need check
  const pairsToCheck = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = matrix[i][j];
      const sameCategory = results[i].category === results[j].category;
      if (sim >= 0.32 && sameCategory && sim < 0.53) {
        const key = getPairKey(results[i].issue, results[j].issue);
        if (!pairCache.has(key)) {
          pairCache.set(key, null); // reserve
          pairsToCheck.push({ issueA: results[i].issue, issueB: results[j].issue, key });
        }
      }
    }
  }

  // Execute borderline pair checks concurrently through the limiter
  if (pairsToCheck.length > 0) {
    let completedPairs = 0;
    const pairTasks = pairsToCheck.map(({ issueA, issueB, key }) => limit(async () => {
      const prompt = PROMPTS.pair(issueA, issueB);
      const res = await callModel(prompt, "pair", profile);
      recordCall(res);
      pairCache.set(key, res);
      completedPairs++;
      onProgress?.({
        current: completedPairs,
        total: pairsToCheck.length,
        stage: "grouping",
        stageNum: 2,
        text: `Stage 2 of 3: Checking duplicate pairs (${completedPairs} of ${pairsToCheck.length})…`
      });
      return res;
    }));
    await Promise.all(pairTasks);
  }

  // Execute grouping in original input order using the pair results
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = matrix[i][j];
      const sameCategory = results[i].category === results[j].category;
      if (sim >= 0.53 && sameCategory) {
        union(i, j);
      } else if (sim >= 0.32 && sameCategory && sim < 0.53) {
        const key = getPairKey(results[i].issue, results[j].issue);
        const pair = pairCache.get(key);
        if (pair?.same_problem) {
          union(i, j);
        }
      }
    }
  }

  // Build groups
  const groups = {};
  results.forEach((c, i) => {
    const k = find(i);
    (groups[k] || (groups[k] = [])).push(c);
  });

  // Stage 3: Per-case recommendation with limiter
  const groupEntries = Object.values(groups);
  let completedCases = 0;
  onProgress?.({
    current: 0,
    total: groupEntries.length,
    stage: "cases",
    stageNum: 3,
    text: `Stage 3 of 3: Generating recommendations for ${groupEntries.length} case${groupEntries.length === 1 ? "" : "s"}…`
  });
  const caseTasks = groupEntries.map((members, groupIdx) => limit(async () => {
    const cats = {};
    members.forEach(c => cats[c.category] = (cats[c.category] || 0) + 1);
    const category = Object.keys(cats).sort((a, b) => cats[b] - cats[a])[0] || "Unassigned";

    const urgOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const urgency = members.reduce((a, c) => urgOrder[c.urgency] > urgOrder[a] ? c.urgency : a, "low");

    const langs = {};
    members.forEach(c => langs[c.language] = (langs[c.language] || 0) + 1);
    const languages = Object.keys(langs).sort((a, b) => langs[b] - langs[a]);

    const prompt = PROMPTS.case({
      issues: members.map(c => c.issue),
      category,
      languages,
      departments,
      organisationType: profile.terms.organisationType,
      itemName: profile.terms.itemName
    });

    const rec = await callModel(prompt, "case", profile);
    recordCall(rec);
    completedCases++;
    onProgress?.({
      current: completedCases,
      total: groupEntries.length,
      stage: "cases",
      stageNum: 3,
      text: `Stage 3 of 3: Drafting recommendation ${completedCases} of ${groupEntries.length}…`
    });

    const validDepartment = departments.some(d => d.name === rec.department);
    const department = validDepartment ? rec.department : "Unassigned";

    return {
      groupIdx,
      category,
      urgency,
      department,
      rec,
      validDepartment,
      members
    };
  }));

  const caseOutcomes = await Promise.all(caseTasks);
  const cases = caseOutcomes.map(({ groupIdx, category, urgency, department, rec, validDepartment, members }) => {
    const caseId = "CASE-" + String(groupIdx + 1).padStart(3, "0");
    return {
      id: caseId,
      title: members.length >= 5
        ? members.length + " " + profile.terms.itemNamePlural + ", " + category + " recurring issue"
        : category + " — " + members[0].issue,
      category,
      urgency,
      urgency_reason: members.find(c => c.urgency === urgency)?.urgency_reason || "Priority reflects the most urgent complaint in this case.",
      department,
      next_action: rec.next_action || "Ask a human reviewer to assign the right department.",
      draft_reply: rec.draft_reply || "Thank you for the report. A reviewer will assess the next steps.",
      confidence: Math.min(...members.map(c => c.confidence), validDepartment ? (rec.confidence ?? 0.5) : 0.2),
      needsReview: members.some(c => c.needsReview) || !validDepartment || !!rec.needsReview,
      departmentFlag: validDepartment ? undefined : "Unassigned department requires human review",
      complaints: members.map(c => ({ ...c })),
      status: "Pending review",
      decision: null,
      overridden: false,
      createdAt: new Date().toISOString(),
      safetyRaised: members.some(c => c.safetyRaised),
      analysisMocked: members.some(c => c.analysisMocked) || !!rec._mock
    };
  });

  cases.sort((a, b) =>
    ({ critical: 4, high: 3, medium: 2, low: 1 }[b.urgency] - { critical: 4, high: 3, medium: 2, low: 1 }[a.urgency]) ||
    b.complaints.length - a.complaints.length
  );

  // Per-call mode tracking across all calls in this run
  const totalCalls = callResults.length;
  const mockCalls = callResults.filter(r => r._mock).length;
  const realCalls = totalCalls - mockCalls;

  const reasonCounts = {};
  for (const r of callResults) {
    if (r._mock && r._reason) {
      reasonCounts[r._reason] = (reasonCounts[r._reason] || 0) + 1;
    }
  }
  const mostCommonReason = Object.keys(reasonCounts).sort((a, b) => reasonCounts[b] - reasonCounts[a])[0] || "";

  let aiMode = "mock";
  let aiSummary = "Mock";

  if (totalCalls > 0 && mockCalls === 0) {
    aiMode = "real";
    aiSummary = "Real model";
  } else if (realCalls > 0 && mockCalls > 0) {
    aiMode = "partial";
    aiSummary = `Partial (${mockCalls} of ${totalCalls} calls fell back to mock)`;
  } else {
    aiMode = "mock";
    aiSummary = "Mock";
  }

  console.log(`Analysis run completed: ${totalCalls} total model calls (${realCalls} real, ${mockCalls} mock). Mode: ${aiSummary}`);

  return {
    cases,
    complaints: results,
    mocked: aiMode !== "real",
    aiMode,
    aiSummary,
    aiFallbackReason: mostCommonReason,
    stats: { totalCalls, realCalls, mockCalls }
  };
}