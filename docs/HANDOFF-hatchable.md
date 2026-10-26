# TriageDesk handoff

## Source of truth
This package was derived from the current Hatchable TriageDesk v9 files. All demo and benchmark text is synthetic. No API key or secret value is included.

## Architecture and modules
- public/index.html: static shell, navigation, accessibility controls and entry point.
- public/app.js: single-page UI, state management, inbox import/add/clear, profile editor, case review/approval/override, benchmark generation and rendering.
- public/style.css: design tokens, responsive layout, components and high-contrast styles.
- api/analyze.js: accepts up to 200 non-empty complaint items and calls analysis pipeline.
- api/state.js: reads/writes allowed state fields.
- lib/analysis.js: masks text, calls model, applies safety urgency floor, calculates similarity, groups complaints and builds recommendations.
- lib/callModel.js: Google Gemini API request for a configured Gemma model; strict output checks and deterministic mock fallback.
- lib/prompts.js: three prompts.
- lib/profiles.js: Campus, City / municipal services, Utility / service desk, Custom presets and City/Utility demo data.
- lib/similarity.js: tokenization, TF-IDF-like weighting, cosine similarity and category boost.
- lib/rules.js: urgency vocabulary, department normalization and safety keyword floor.
- lib/masking.js: email, phone and common ID pattern masking.
- lib/db.js and migrations/001_state.sql: JSONB state persistence in PostgreSQL.
- hatchable.toml: optional Google AI integration settings.

## Data model
Persisted state keys are complaints, cases, audit, benchmark, aiMocked, and workspace. A complaint includes id, text, language, status and, after analysis, maskedText, category, issue, urgency, urgency_reason, confidence, needsReview, safetyRaised, analysisMocked. A case includes id/title/category/urgency/department/next_action/draft_reply/confidence/status/decision/overridden/createdAt/safetyRaised and nested complaints. Audit entries include caseId, action, changed, note, at. Workspace includes id/name/terms/departments/safetyKeywords.

## User flows
1. Home: view counts, load synthetic demo data, run analysis, open cases, use quick actions.
2. Inbox: add one synthetic complaint, import CSV with a required text column, search/filter, clear inbox and cases (audit history is retained).
3. Analysis: masks selected patterns, requests per-item analysis, raises urgency to at least high when safety keywords match, calculates similarities and groups items, then requests a recommendation for each group.
4. Cases: filter/search, inspect recommendation, see evidence complaints and open review.
5. Review: approve valid recommendations or override department/urgency with a required note; record changes in audit history. Safety-raised urgency cannot be lowered below high.
6. Workspace: select Campus/City/Utility/Custom; edit terms, department name/icon/description/order and safety keywords; save or reset. Existing complaints/cases are preserved when changing profiles. Removed department assignments remain and require human reassignment.
7. Insights/Benchmark: generates 150 synthetic labelled benchmark rows from the 80 campus examples, runs the pipeline, and records department accuracy, urgency agreement, safety recall, duplicate precision and duplicate recall.
8. Accessibility: responsive nav, skip link, display-language setting, text-size controls, high-contrast mode and reduced-motion CSS.

## Similarity and grouping
- Lowercase text, replace non-ASCII letters/punctuation with spaces using /[^a-z0-9 ]/g, split whitespace, discard tokens length <=2 and a fixed English stop list.
- Document frequency is counted once per document. Weight each token by (1 + ln(tf)) * (ln(1 + (N+1)/(1+df)) + 1).
- Pair score is 0.88 * cosine(weighted vectors) + 0.12 if categories match, otherwise 0.88 * cosine.
- For each pair in input order: if categories match and score >= 0.53, union directly. If categories match and score is >=0.32 but <0.53, call same-problem model prompt and union only if same_problem=true. All other pairs are not sent to the pair model.
- Union-find connected components form groups; this is transitive, so a group can contain a pair that was not itself directly checked.
- Group category is the most common complaint category; urgency is maximum severity; languages are sorted by descending count; recommendation model called once per group.
- The category boost and pair thresholds are heuristic and not calibrated against an independent production dataset.

## Schemas and validation
The JSON files beside this document formalize the observed output checks for handoff. The live code does not use provider-native JSON Schema; it asks for JSON mode and performs manual checks. Complaint output requires urgency and language enums, issue and urgency_reason strings, confidence 0..1. Invalid category becomes Unassigned and triggers review. Pair output requires boolean same_problem and string reason. Case output requires next_action and draft_reply strings and confidence 0..1; invalid department becomes Unassigned and triggers review. Extra properties are not explicitly rejected.

## Benchmark metrics (every result is MOCK MODEL output unless a live configured model responds)
The benchmark is generated in public/app.js by benchmarkSet(), not stored as a static source file. It creates 150 rows: repeats the 80 demo rows cyclically; rows after the first 80 append a synthetic variant suffix. true_department is assigned by guessDepartment() keyword rules; true_urgency by guessUrgency() keyword rules; true_case_id by the formula in benchmarkSet(). These are heuristic labels, not human-annotated ground truth.
- Department accuracy = count(predicted category == true_department) / labelled row count * 100.
- Urgency agreement = count(predicted urgency == true_urgency) / labelled row count * 100.
- Safety recall = among rows whose true_urgency is high, proportion with safetyRaised and predicted urgency rank at least high. Note true high labels come from mock heuristic rules.
- Duplicate precision = true positive predicted co-group pairs / all predicted co-group pairs * 100.
- Duplicate recall = true positive predicted co-group pairs / all true same-case pairs * 100.
- Pair sets use unordered complaint-id pairs. True positive means predicted pair exists in the truth pair set.
- UI stores metric values rounded to one decimal. Each stored result includes mode MOCK or Gemma. Do not present a benchmark score as real-model quality when mode is MOCK. The included benchmark.csv uses the generated labels and does not contain a model result.

## Mock versus real
- Real code: UI and API orchestration, browser CSV parsing, regex masking, rule-based safety floor, similarity math, union-find grouping, PostgreSQL JSONB state persistence on Hatchable, and human review/audit interactions.
- Model-dependent: complaint categorization/summary/urgency/language, borderline same-problem checks, case recommendations. A configured Google API key sends requests to the configured Gemma model.
- Missing GEMINI_API_KEY or any request/parse/validation/API failure falls back to deterministic mock() and returns _mock=true with a short _reason. The UI marks mode as Mock AI. GEMMA_MODEL is optional and defaults to gemma-3-12b-it.
- The application is a demo and not an official complaint-handling service.

## Known limitations / bugs
- The benchmark labels are generated from the same keyword-based synthetic corpus and are not independent human labels; scores measure agreement with heuristics.
- Current grouping can merge transitive chains, and the same-category requirement applies before both automatic and model-assisted grouping.
- Regex masking is not comprehensive PII detection.
- UI's display-language selector changes document language and displays a toast; it does not translate every UI string.
- City/Utility synthetic demo rows are generated from presets. Campus dataset is embedded in public/app.js.
- The project deploy emitted a warning that migrations exist while the platform deploy analyzer did not detect database imports in api/pages files; however lib/db.js imports the platform db and api/state.js imports getState/putState. Verify persistence after local migration.
- No native source ZIP/export feature was exposed by the available project tools. Exact source files are included in source-export.json for recovery; this is a JSON map of original paths to full contents, not a ZIP archive.
- Native PDF/DOCX complaint upload is not implemented; CSV import and pasted text are implemented.
- No separate production-grade authentication/authorization, rate limiting, observability or human-labeled evaluation pipeline is included in these source files.