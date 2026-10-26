import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, "../data/state.json");

const DEFAULT_STATE = {
  complaints: [],
  cases: [],
  audit: [],
  benchmark: [],
  aiMocked: true,
  aiMode: "mock",
  aiSummary: "Mock",
  aiFallbackReason: "",
  workspace: null,
};

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY)?.trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log(`Database: Connected to Supabase (${supabaseUrl})`);
} else {
  console.log("Database: Using local storage (data/state.json). Set SUPABASE_URL to connect hosted Postgres.");
}

async function readStateFile() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { ...DEFAULT_STATE };
    }
    throw err;
  }
}

async function writeStateFile(data) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getState() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("triagedesk_state").select("key, value");
      if (!error && Array.isArray(data)) {
        const state = { ...DEFAULT_STATE };
        for (const row of data) {
          state[row.key] = row.value;
        }
        return state;
      }
      if (error) {
        console.warn("Supabase query warning:", error.message, "- falling back to local file");
      }
    } catch (e) {
      console.warn("Supabase read error:", e.message, "- falling back to local file");
    }
  }

  const current = await readStateFile();
  return { ...DEFAULT_STATE, ...current };
}

export async function putState(keyOrPatch, maybeValue) {
  const patch = typeof keyOrPatch === "object" && keyOrPatch !== null
    ? keyOrPatch
    : { [keyOrPatch]: maybeValue };

  const entries = Object.entries(patch);

  if (supabase) {
    try {
      const rows = entries.map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("triagedesk_state").upsert(
        rows,
        { onConflict: "key" }
      );
      if (!error) {
        const current = await readStateFile().catch(() => ({ ...DEFAULT_STATE }));
        Object.assign(current, patch);
        await writeStateFile(current).catch(() => {});
        return patch;
      }
      console.warn("Supabase write warning:", error.message, "- persisting to local file");
    } catch (e) {
      console.warn("Supabase write error:", e.message, "- persisting to local file");
    }
  }

  const current = await getState();
  Object.assign(current, patch);
  await writeStateFile(current);
  return patch;
}