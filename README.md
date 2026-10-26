# TriageDesk — Human-Led Grievance Intelligence

> **AI recommends. A human decides.**  
> An open-source, privacy-aware public grievance and service request analyzer built with Google's open-weight **Gemma** models.

[![Hacktoberfest MLH](https://img.shields.io/badge/Hacktoberfest-MLH%20Hack%20Day-orange)](https://www.mlh.com/events/hacktoberfest-hack-day-amaravati-x-ai-based-productivity-tools-club-vit-ap/challenges/01a17436-7342-73c2-6e49-be0b4de4697d)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-brightgreen.svg)](package.json)
[![Tests: Built-in node:test](https://img.shields.io/badge/Tests-34%20Passing-success)](test/unit.test.js)

---

## 1. Challenge & Context

Built for the **Major League Hacking (MLH) Hacktoberfest Hack Day Amaravati x AIBPT club - VIT-AP** under the challenge:  
**"AI-Powered Public Grievance & Service Request Analyzer"**.

### Challenge Objectives Addressed
* **Intake & Multi-Modal Text Analysis**: Reads incoming citizen / student requests across English, Telugu, Hindi, and code-mixed formats.
* **Issue & Urgency Identification**: Extracts core issues, severity levels, and department routing.
* **Duplicate & Cluster Detection**: Groups duplicate or related complaints into unified cases using TF-IDF cosine similarity, transitive Union-Find, and Gemma pairwise verification.
* **Deterministic Safety Floor**: Guarantees that life-safety hazards (fire, electrical sparks, gas leaks, physical threats) are elevated to high or critical urgency across English, Telugu, and Hindi, preventing safety risks from being downgraded.
* **Privacy by Design**: Automatically masks emails, phone numbers, roll numbers, and institutional ID formats prior to AI analysis.
* **Human-in-the-Loop Decision Making**: AI recommendations are transparent and non-binding; human triage officers approve or override decisions with required audit logging.

### Targeted Prize Categories
1. **Best Open-Source AI Project** (clean, zero-native-dependency architecture, unit test suite, and open synthetic benchmark).
2. **Best Use of Gemma** (uses open-weight Gemma models via the Google Gemini API with fallback handling, JSON schema adherence, and latency/concurrency management).

---

## 2. Key Features

```
Incoming Request (Pasted / CSV)
       │
       ▼
 [PII Masker] ─────────────► Masks emails, phone numbers, student IDs
       │
       ▼
[Gemma AI Analysis] ───────► Extracts category, urgency, issue summary & confidence
       │
       ▼
[Deterministic Floor] ─────► Enforces minimum high/critical on safety keywords
       │
       ▼
[Clustering Pipeline] ─────► TF-IDF vectorizer + Cosine similarity (0.88) + Category boost (0.12)
       │                      Borderline pairs (0.32-0.53) verified by Gemma pair model
       ▼
 [Union-Find Grouping] ────► Forms multi-complaint Cases with consolidated root causes
       │
       ▼
[Case Recommendation] ────► Gemma synthesizes next action, root cause summary & draft citizen reply
       │
       ▼
[Human Review Queue] ──────► Official approves or overrides with mandatory audit log note
```

* **Three-State AI Resilience Indicator**: Real-time header badge reporting whether analysis ran on a live Gemma model (`Real model` - green), encountered API quota/rate limits on some calls (`Partial` - orange), or used local deterministic fallback (`Mock AI` - grey).
* **Workspace Profiles**: Pre-configured presets for **Campus** (e.g., VIT-AP), **City / Municipal Services**, **Utility / Service Desk**, and customizable workspaces.
* **Transparent Evidence**: Every AI recommendation cites quotes directly from original complaints and displays a confidence score.
* **Accessibility First**: WCAG-compliant design featuring High Contrast mode, font size adjustment (Small / Normal / Large), responsive mobile layout, skip-to-content links, and reduced-motion support.

---

## 3. Technology Stack & Dependencies

TriageDesk has **zero native compilation dependencies** and runs cleanly on any modern Node.js environment (Node 20+) across Windows, Linux, and macOS:

| Package | Version | Purpose | License |
|---|---|---|---|
| `express` | `^5.3.0` | HTTP routing, static assets, and REST API | MIT |
| `dotenv` | `^18.0.9` | Environment variable management | BSD-2-Clause |
| `node:test` | Built-in | Native Node.js unit test runner | Node.js (MIT) |
| `node:assert` | Built-in | Strict assertion library | Node.js (MIT) |

No heavy frameworks, databases, or closed proprietary AI SDKs are required. State is persisted in local JSON storage (`data/state.json`).

---

## 4. Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) v20.0.0 or higher.
* A Google Gemini API key with access to open-weight Gemma models (obtain model access via [mlh.link/gemma](https://mlh.link/gemma)).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/triagedesk.git
   cd triagedesk
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your preferred settings:
   ```env
   # Your Google Gemini API Key
   GEMINI_API_KEY=your_api_key_here

   # Open-weight Gemma model identifier (from mlh.link/gemma)
   GEMMA_MODEL=gemma-3-12b-it

   # Server port
   PORT=3000

   # Concurrent model call limit (prevents 429 rate limits)
   MODEL_CONCURRENCY=3
   ```

4. **Verify your Gemma API connectivity**:
   Run the model validation script:
   ```bash
   npm run check-model
   ```
   *If an API key is set*, this verifies all 3 prompt types (Complaint, Pair Comparison, Case Synthesis) across English, Telugu, and Hindi samples against the live Gemma model.  
   *If no API key is set*, it cleanly exits with mock diagnostics.

5. **Start the application**:
   ```bash
   npm start
   ```
   Open your browser at `http://localhost:3000`.

---

## 5. Development & Testing

### Run Unit Tests
TriageDesk includes a comprehensive test suite covering regex PII masking, deterministic safety floors across 3 languages, cosine similarity math, union-find grouping, normalization fallbacks, and 3-state mode calculations:
```bash
npm test
```
*(Runs 34 tests via `node:test` in ~200ms).*

### Run Benchmark Evaluation
Evaluate the pipeline against the 160-complaint labeled synthetic benchmark dataset:
```bash
npm run benchmark
```
This CLI script computes:
* **Department Accuracy**: Exact match against ground-truth departments.
* **Urgency Agreement**: Exact match against ground-truth urgencies after safety floor.
* **Safety Recall**: Percentage of critical/high safety grievances correctly elevated by the safety floor.
* **Duplicate Precision**: Pairwise precision of predicted duplicate clusters vs. ground truth.
* **Duplicate Recall**: Pairwise recall of captured duplicate pairs.

Results are printed to the console and automatically saved to `data/state.json` for review on the web application's **Insights & Benchmark** page.

---

## 6. Project Architecture

```
triagedesk/
├── api/
│   ├── analyze.js            # POST /api/analyze & GET /api/analyze/progress
│   └── state.js              # State persistence handler
├── data/
│   ├── benchmark-labeled.json # 160 labeled synthetic test cases with ground truth
│   └── state.json            # Persistent JSON application state (ignored in git)
├── demo/
│   ├── demo-campus.csv       # Campus synthetic test data (80 complaints)
│   ├── demo-city.csv         # City / municipal synthetic dataset
│   └── demo-utility.csv      # Utility desk synthetic dataset
├── docs/
│   ├── schemas/              # Formal JSON schemas for model outputs
│   └── HANDOFF-hatchable.md  # Original migration notes & design constraints
├── lib/
│   ├── analysis.js           # Multi-stage triage orchestration & clustering pipeline
│   ├── callModel.js          # Google Gemini API client with Gemma JSON mode & retry backoff
│   ├── concurrency.js        # Bounded concurrency limiter for rate-limiting compliance
│   ├── db.js                 # File-based JSON state store
│   ├── masking.js            # PII masking (emails, phone numbers, roll numbers, student IDs)
│   ├── profiles.js           # Workspace presets (Campus, City, Utility, Custom)
│   ├── rules.js              # Deterministic safety keywords (EN, TE, HI) & urgency logic
│   └── similarity.js         # TF-IDF vectorization and cosine similarity
├── public/
│   ├── app.js                # Frontend SPA logic, review queue, and benchmark UI
│   ├── index.html            # Semantic HTML shell, accessibility landmarks
│   └── style.css             # Vanilla CSS design system with High-Contrast mode
├── scripts/
│   ├── check-model.js        # Model verification CLI for Hackathon judges
│   ├── benchmark.js          # CLI benchmark evaluation tool
│   └── generate-benchmark.js  # Generator for the 160-row labeled benchmark dataset
├── test/
│   └── unit.test.js          # Unit tests for core functions
├── .env.example              # Template environment configuration
├── package.json              # ES modules, dependencies, and npm scripts
└── server.js                 # Express server with static serving & API endpoints
```

---

## 7. Gemma Model Configuration

Under the challenge rules, **all AI capabilities use open-weight Gemma models** called via Google Gemini API endpoints:
* Recommended model: `gemma-3-12b-it` or `gemma-2-9b-it`.
* Structured Output: TriageDesk requests `application/json` response MIME types with automatic fallback to text mode and regex repair if JSON mode is unavailable for a given model checkpoint.
* Resilience: Automatic exponential backoff handles transient `429 Too Many Requests` or `5xx` server errors.

---

## 8. Hackathon Submission Checklist

- [x] Ported from hosted platform to clean, standalone Node.js Express application.
- [x] Open-weight Gemma model integration with real-time 3-state status indicator (`Real`, `Partial`, `Mock`).
- [x] Concurrency limiter, exponential backoff, and analysis progress reporting.
- [x] Deterministic safety floor supporting English, Telugu, and Hindi emergency keywords.
- [x] Privacy-preserving regex PII masking before any network call.
- [x] 160-row synthetic labeled benchmark dataset with distinct `true_case_id` per non-duplicate.
- [x] Automated CLI benchmark script and web benchmark dashboard.
- [x] 34 passing unit tests covering all core modules.
- [x] Zero native binary dependencies; runs across all major operating systems.
- [x] Secret scan verified: No private credentials or API keys in repository history.

---

## 9. License

This project is licensed under the [MIT License](LICENSE).
All benchmark and demo data are entirely synthetic and contain no real personal identifiable information.
