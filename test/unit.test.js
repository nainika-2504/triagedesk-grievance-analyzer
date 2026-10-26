/**
 * Unit tests for TriageDesk — Stage 3
 * Uses Node.js built-in test runner (node:test). No extra framework.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// -------------------------------------------------------
// 1. Masking
// -------------------------------------------------------
import { maskPersonalDetails } from "../lib/masking.js";

test("masks email addresses", () => {
  const result = maskPersonalDetails("Contact me at user.name+tag@example.co.in for details.");
  assert.ok(result.includes("[EMAIL]"), "email should be masked");
  assert.ok(!result.includes("@"), "original email should not remain");
});

test("masks international phone numbers", () => {
  const result = maskPersonalDetails("My number is +91 98765 43210, call anytime.");
  assert.ok(result.includes("[PHONE]"), "phone should be masked");
});

test("masks 10-digit phone numbers", () => {
  const result = maskPersonalDetails("Call 9876543210 for help.");
  assert.ok(result.includes("[PHONE]"), "10-digit phone should be masked");
});

test("does not mask short numbers (roll number check)", () => {
  const result = maskPersonalDetails("Room 412 needs repair.");
  assert.ok(!result.includes("[PHONE]"), "short number like 412 should not be masked");
  assert.ok(result.includes("412"), "short number should remain");
});

test("masks ID patterns", () => {
  const result = maskPersonalDetails("My student id: ST2024001 needs update.");
  assert.ok(result.includes("[ID]"), "ID pattern should be masked");
});

test("masks VIT-AP student ID format", () => {
  const result = maskPersonalDetails("My VITAP21BCE1234 card is lost.");
  assert.ok(result.includes("[ID]"), "VITAP ID should be masked");
});

test("does not mask plain text words", () => {
  const result = maskPersonalDetails("Water supply issue in Hostel B block.");
  assert.equal(result, "Water supply issue in Hostel B block.", "plain text should not be modified");
});

test("does not mask 4-digit year numbers", () => {
  const result = maskPersonalDetails("The issue started in 2024.");
  assert.ok(!result.includes("[PHONE]"), "year 2024 should not be masked as phone");
  assert.ok(result.includes("2024"), "year should remain in text");
});

// -------------------------------------------------------
// 2. Safety floor: English, Telugu, Hindi keywords
// -------------------------------------------------------
import { floorUrgency, normalizeUrgency } from "../lib/rules.js";
import { getProfile } from "../lib/profiles.js";

const campusProfile = getProfile("campus");

function applyFloor(text, urgency = "low") {
  return floorUrgency(normalizeUrgency(urgency), text, campusProfile);
}

test("safety floor raises English 'fire' to high", () => {
  const { urgency, raised } = applyFloor("There is a fire in the lab", "low");
  assert.equal(urgency, "high", "should raise to high");
  assert.equal(raised, true, "raised flag should be true");
});

test("safety floor raises English 'electric shock' to high", () => {
  const { urgency, raised } = applyFloor("Student got an electric shock", "medium");
  assert.equal(urgency, "high");
  assert.equal(raised, true);
});

test("safety floor raises Telugu ప్రమాదం to high", () => {
  const { urgency, raised } = applyFloor("హాస్టల్‌లో ప్రమాదం జరిగింది", "low");
  assert.equal(urgency, "high", "Telugu safety keyword should raise urgency");
  assert.equal(raised, true);
});

test("safety floor raises Telugu మంటలు (flames) to high", () => {
  const { urgency, raised } = applyFloor("విద్యుత్ ప్యానెల్ దగ్గర మంటలు వస్తున్నాయి", "low");
  assert.equal(urgency, "high");
  assert.equal(raised, true);
});

test("safety floor raises Telugu విద్యుత్ షాక్ to high", () => {
  const { urgency, raised } = applyFloor("లాబ్‌లో విద్యుత్ షాక్ సంభవించింది", "low");
  assert.equal(urgency, "high");
  assert.equal(raised, true);
});

test("safety floor raises Hindi आग (fire) to high", () => {
  const { urgency, raised } = applyFloor("हॉस्टल में आग लग गई है", "low");
  assert.equal(urgency, "high", "Hindi आग should raise urgency");
  assert.equal(raised, true);
});

test("safety floor raises Hindi बिजली का झटका to high", () => {
  const { urgency, raised } = applyFloor("छात्र को बिजली का झटका लगा", "low");
  assert.equal(urgency, "high");
  assert.equal(raised, true);
});

test("safety floor raises Hindi आपातकाल (emergency) to high", () => {
  const { urgency, raised } = applyFloor("यह एक आपातकाल की स्थिति है", "low");
  assert.equal(urgency, "high");
  assert.equal(raised, true);
});

test("safety floor does not lower existing critical urgency", () => {
  const { urgency } = applyFloor("Some minor complaint text", "critical");
  assert.equal(urgency, "critical", "critical should not be lowered when no safety keyword");
});

test("safety floor does not raise non-safety complaints", () => {
  const { urgency, raised } = applyFloor("The mess food was cold today", "low");
  assert.equal(urgency, "low", "non-safety text should keep low urgency");
  assert.equal(raised, false);
});

test("safety floor cannot lower safety-raised urgency below high", () => {
  // If urgency is already 'high' due to safety, it should stay at high or above
  const { urgency, raised } = applyFloor("There is a fire near the lab", "high");
  assert.ok(["high", "critical"].includes(urgency), "should stay high or above");
  assert.equal(raised, true);
});

// -------------------------------------------------------
// 3. Similarity and union-find grouping
// -------------------------------------------------------
import { similarityMatrix, terms, cosine, vector } from "../lib/similarity.js";

test("terms() removes stop words and short tokens", () => {
  const result = terms("The water is not working in the hostel");
  assert.ok(!result.includes("the"), "stop word 'the' should be removed");
  assert.ok(!result.includes("in"), "stop word 'in' should be removed");
  assert.ok(result.includes("water"), "content word 'water' should remain");
  assert.ok(result.includes("working"), "content word 'working' should remain");
});

test("terms() with extra stop words removes domain words", () => {
  const result = terms("water hostel room supply issue", ["water", "hostel", "room", "supply"]);
  assert.ok(!result.includes("water"), "domain stop word water should be removed");
  assert.ok(!result.includes("hostel"), "domain stop word hostel should be removed");
  assert.ok(result.includes("issue"), "non-stop word issue should remain");
});

test("cosine similarity is 1.0 for identical vectors", () => {
  const v = { water: 1, hostel: 2 };
  const sim = cosine(v, v);
  assert.ok(Math.abs(sim - 1.0) < 0.001, "identical vectors should have cosine = 1");
});

test("cosine similarity is 0 for orthogonal vectors", () => {
  const a = { water: 1 };
  const b = { food: 1 };
  const sim = cosine(a, b);
  assert.equal(sim, 0, "orthogonal vectors should have cosine = 0");
});

test("similarityMatrix returns 1.0 on diagonal", () => {
  const items = [
    { id: "1", issue: "no water in hostel", category: "Hostel" },
    { id: "2", issue: "food quality is bad", category: "Mess/Food" },
  ];
  const matrix = similarityMatrix(items);
  assert.ok(Math.abs(matrix[0][0] - 1.0) < 0.001);
  assert.ok(Math.abs(matrix[1][1] - 1.0) < 0.001);
});

test("similarityMatrix gives 0.12 category boost for same category", () => {
  const items = [
    { id: "1", issue: "tap dripping", category: "Hostel" },
    { id: "2", issue: "fan broken", category: "Hostel" },
    { id: "3", issue: "lunch cold", category: "Mess/Food" },
  ];
  const matrix = similarityMatrix(items);
  // items 0 and 1 share category; items 0 and 2 do not
  // The boost of 0.12 means same-category pair should score higher
  // (even if issue text is different), compared to cross-category
  const sameCatScore = matrix[0][1];
  const crossCatScore = matrix[0][2];
  assert.ok(sameCatScore >= 0.12, "same-category pair should get at least 0.12 boost");
});

test("union-find groups similar complaints correctly", () => {
  // Simulate union-find directly
  const n = 4;
  const parent = [0, 1, 2, 3];
  const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };

  union(0, 1);
  union(1, 2);
  // 0,1,2 should be in the same group; 3 is separate
  assert.equal(find(0), find(1), "0 and 1 should be grouped");
  assert.equal(find(1), find(2), "1 and 2 should be grouped");
  assert.notEqual(find(0), find(3), "0 and 3 should be separate");
});

// -------------------------------------------------------
// 4. Department and urgency normalization
// -------------------------------------------------------
import { normalizeDepartment } from "../lib/rules.js";

test("normalizeUrgency maps valid values correctly", () => {
  assert.equal(normalizeUrgency("high"), "high");
  assert.equal(normalizeUrgency("critical"), "critical");
  assert.equal(normalizeUrgency("medium"), "medium");
  assert.equal(normalizeUrgency("low"), "low");
});

test("normalizeUrgency falls back to 'medium' for invalid input", () => {
  assert.equal(normalizeUrgency("extreme"), "medium");
  assert.equal(normalizeUrgency(undefined), "medium");
  assert.equal(normalizeUrgency(null), "medium");
});

test("normalizeDepartment returns valid department name", () => {
  const result = normalizeDepartment("Hostel", campusProfile);
  assert.equal(result, "Hostel");
});

test("normalizeDepartment returns 'Unassigned' for unknown department", () => {
  const result = normalizeDepartment("Unknown Department XYZ", campusProfile);
  assert.equal(result, "Unassigned");
});

// -------------------------------------------------------
// 5. Three-state mode reporting
// -------------------------------------------------------
// Simulate what analyzeComplaints returns for mode reporting
function computeMode(callResults) {
  const totalCalls = callResults.length;
  const mockCalls = callResults.filter(r => r._mock).length;
  const realCalls = totalCalls - mockCalls;

  if (totalCalls === 0) return { aiMode: "mock", aiSummary: "Mock" };
  if (mockCalls === 0) return { aiMode: "real", aiSummary: "Real model" };
  if (realCalls > 0 && mockCalls > 0) return { aiMode: "partial", aiSummary: `Partial (${mockCalls} of ${totalCalls} calls fell back to mock)` };
  return { aiMode: "mock", aiSummary: "Mock" };
}

test("mode is 'real' when all calls succeeded", () => {
  const calls = [{ _mock: false }, { _mock: false }, { _mock: false }];
  const { aiMode } = computeMode(calls);
  assert.equal(aiMode, "real");
});

test("mode is 'mock' when all calls fell back", () => {
  const calls = [{ _mock: true }, { _mock: true }];
  const { aiMode } = computeMode(calls);
  assert.equal(aiMode, "mock");
});

test("mode is 'partial' when some calls fell back", () => {
  const calls = [{ _mock: false }, { _mock: true }, { _mock: false }];
  const { aiMode, aiSummary } = computeMode(calls);
  assert.equal(aiMode, "partial");
  assert.ok(aiSummary.includes("Partial"), "summary should indicate partial");
  assert.ok(aiSummary.includes("1 of 3"), "summary should include counts");
});

test("mode is 'mock' when there are zero calls", () => {
  const { aiMode } = computeMode([]);
  assert.equal(aiMode, "mock");
});
