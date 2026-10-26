import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, "../data/state.json");

const DEFAULT_STATE = {
  complaints: [],
  cases: [],
  audit: [],
  benchmark: [],
  aiMocked: true,
  workspace: null,
};

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
  const current = await readStateFile();
  return { ...DEFAULT_STATE, ...current };
}

export async function putState(key, value) {
  const current = await getState();
  current[key] = value;
  await writeStateFile(current);
  return value;
}