import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Pool } from "pg";
import { exec, execSync } from "child_process";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const IMPORT_REGEX_CACHE = new Map<string, RegExp>();
const getImportRegex = (name: string): RegExp => {
  let regex = IMPORT_REGEX_CACHE.get(name);
  if (!regex) {
    regex = new RegExp(`\\b${name}\\b`, 'g');
    IMPORT_REGEX_CACHE.set(name, regex);
  }
  return regex;
};

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Parcle In-Memory Database with backups to disk
const PARCLE_FILE_PATH = path.join(process.cwd(), "parcle_memory_db.json");
let parcleDb: {
  readmes: Record<string, { content: string; timestamp: string; sha: string; author?: string }>;
  prs: Record<string, { url: string; sha: string; title: string; status: string; timestamp: string }>;
  v_store: Array<{ id: string; filename: string; section: string; content: string; embedding?: number[] }>;
  qa_logs: Array<{ query: string; answer: string; timestamp: string; sources: any[] }>;
  clean_patches: Record<string, { file: string; patch: string; timestamp: string; applied: boolean; issues?: any[] }>;
  pipeline_runs: Array<{ id: string; name: string; status: string; timestamp: string; log: string }>;
  routing_events: Array<{ id: string; timestamp: string; eventType: string; payload: string; route: string; confidence: number; outcome: string; failed?: boolean }>;
} = {
  readmes: {},
  prs: {},
  v_store: [],
  qa_logs: [],
  clean_patches: {},
  pipeline_runs: [],
  routing_events: []
};

// Seed default documentation chunks for Knowledge Base Agent RAG
const DEFAULT_DOCS = [
  {
    id: "doc_1",
    filename: "README.md",
    section: "Overview",
    content: "# CodeLore\nA Workspace lens to help your code and documentations self sustaining, powered by Parcle memory and deployed on Enter."
  },
  {
    id: "doc_2",
    filename: "README.md",
    section: "Setup & Installation",
    content: "## Setup\nTo install dependencies run `npm install`.\nConfiguration is managed via `.env` with variables `GEMINI_API_KEY` and `APP_URL`.\nRun `npm run dev` to start the CodeLore Docs agent control panel on port 3000."
  },
  {
    id: "doc_3",
    filename: "parcle_memory_api.md",
    section: "What is Parcle Memory?",
    content: "Parcle Memory is a high-performance vector and key-value memory layer for AI agents. It stores documentation embeddings for semantic RAG search, README historical versions, and code cleanup patches dynamically."
  },
  {
    id: "doc_4",
    filename: "agents.md",
    section: "Orchestrator Agent",
    content: "The Orchestrator Agent (Generalist) is the central dispatcher. Webhook pushes are fast-routed directly to the Documentation Helper, manual searches go to Knowledge Base, file scans go to Cleaner Agent. Unknown requests are evaluated via Gemini classification LLM."
  },
  {
    id: "doc_5",
    filename: "agents.md",
    section: "Documentation Helper",
    content: "The Documentation Helper automatically rewrites and standardizes structural README files upon push hooks. It extracts the raw diff, reads the existing file, triggers Gemini to synthesize updates, opens simulated Pull Requests on Github, and archives old contents in Parcle."
  },
  {
    id: "doc_6",
    filename: "agents.md",
    section: "Knowledge Base Agent",
    content: "The Knowledge Base Agent answers code and system-level queries. It translates questions into vector embeddings using standard models, executes similarity scoring across Parcle's database, and constructs fully cited, hallucination-free answers."
  },
  {
    id: "doc_7",
    filename: "agents.md",
    section: "Cleaner Agent",
    content: "The Cleaner Agent performs specialized static analysis scanner checks. It discovers unused imports, unreferenced variables, and dead handlers in typescript/javascript layouts. It suggests patches in unified diff format without altering codebases directly."
  }
];

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is missing. Operating in-memory only.");
    return;
  }
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS readmes (
        key VARCHAR(255) PRIMARY KEY,
        content TEXT,
        timestamp VARCHAR(255),
        sha VARCHAR(255),
        author VARCHAR(255)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS prs (
        key VARCHAR(255) PRIMARY KEY,
        url VARCHAR(255),
        sha VARCHAR(255),
        title VARCHAR(255),
        status VARCHAR(255),
        timestamp VARCHAR(255)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS v_store (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255),
        section VARCHAR(255),
        content TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_logs (
        id SERIAL PRIMARY KEY,
        query TEXT,
        answer TEXT,
        timestamp VARCHAR(255),
        sources JSONB
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS clean_patches (
        key VARCHAR(255) PRIMARY KEY,
        file VARCHAR(255),
        patch TEXT,
        timestamp VARCHAR(255),
        applied BOOLEAN
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        status VARCHAR(255),
        timestamp VARCHAR(255),
        log TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS routing_events (
        id VARCHAR(255) PRIMARY KEY,
        timestamp VARCHAR(255),
        event_type VARCHAR(255),
        payload TEXT,
        route VARCHAR(255),
        confidence DOUBLE PRECISION,
        outcome TEXT,
        failed BOOLEAN
      )
    `);
    client.release();
    console.log("Neon database initialized and synced.");
  } catch (err) {
    console.error("Neon database initialization failed", err);
  }
}

async function ensureParcleUser() {
  if (!process.env.PARCLE_API_KEY) return;
  try {
    await fetch("https://api.parcle.ai/v1/users", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PARCLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: "codelore-user",
        name: "CodeLore Workspace User"
      })
    });
  } catch (err) {
    console.error("Failed to ensure Parcle user", err);
  }
}

async function loadParcle() {
  parcleDb.v_store = [...DEFAULT_DOCS];

  if (!process.env.DATABASE_URL) {
    try {
      if (fs.existsSync(PARCLE_FILE_PATH)) {
        const data = fs.readFileSync(PARCLE_FILE_PATH, 'utf-8');
        parcleDb = JSON.parse(data);
      } else {
        await saveParcle();
      }
    } catch (err) {
      console.error("Local Parcle read failed", err);
    }
    return;
  }

  try {
    const client = await pool.connect();
    
    const readmesRes = await client.query("SELECT * FROM readmes");
    parcleDb.readmes = {};
    for (const row of readmesRes.rows) {
      parcleDb.readmes[row.key] = {
        content: row.content,
        timestamp: row.timestamp,
        sha: row.sha,
        author: row.author
      };
    }

    const prsRes = await client.query("SELECT * FROM prs");
    parcleDb.prs = {};
    for (const row of prsRes.rows) {
      parcleDb.prs[row.key] = {
        url: row.url,
        sha: row.sha,
        title: row.title,
        status: row.status,
        timestamp: row.timestamp
      };
    }

    const vstoreRes = await client.query("SELECT * FROM v_store");
    if (vstoreRes.rows.length > 0) {
      parcleDb.v_store = vstoreRes.rows.map(row => ({
        id: row.id,
        filename: row.filename,
        section: row.section,
        content: row.content
      }));
    } else {
      for (const doc of DEFAULT_DOCS) {
        await client.query(
          "INSERT INTO v_store (id, filename, section, content) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
          [doc.id, doc.filename, doc.section, doc.content]
        );
      }
    }

    const qaRes = await client.query("SELECT * FROM qa_logs ORDER BY id DESC LIMIT 50");
    parcleDb.qa_logs = qaRes.rows.map(row => ({
      query: row.query,
      answer: row.answer,
      timestamp: row.timestamp,
      sources: row.sources
    }));

    const patchesRes = await client.query("SELECT * FROM clean_patches");
    parcleDb.clean_patches = {};
    for (const row of patchesRes.rows) {
      parcleDb.clean_patches[row.key] = {
        file: row.file,
        patch: row.patch,
        timestamp: row.timestamp,
        applied: row.applied
      };
    }

    const runsRes = await client.query("SELECT * FROM pipeline_runs ORDER BY timestamp DESC LIMIT 50");
    parcleDb.pipeline_runs = runsRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      timestamp: row.timestamp,
      log: row.log
    }));

    const routingRes = await client.query("SELECT * FROM routing_events ORDER BY id DESC LIMIT 50");
    parcleDb.routing_events = routingRes.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      payload: row.payload,
      route: row.route,
      confidence: row.confidence,
      outcome: row.outcome,
      failed: row.failed
    }));

    client.release();
    console.log("Loaded data from Neon successfully.");
  } catch (err) {
    console.error("Failed to load from Neon, falling back to memory.", err);
  }
}

async function saveParcle(): Promise<boolean> {
  try {
    fs.writeFileSync(PARCLE_FILE_PATH, JSON.stringify(parcleDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Local Parcle write fallback failed", err);
  }

  if (!process.env.DATABASE_URL) {
    return true;
  }

  try {
    const client = await pool.connect();
    await client.query("BEGIN");

    for (const [key, val] of Object.entries(parcleDb.readmes)) {
      await client.query(
        `INSERT INTO readmes (key, content, timestamp, sha, author) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (key) DO UPDATE SET
           content = EXCLUDED.content,
           timestamp = EXCLUDED.timestamp,
           sha = EXCLUDED.sha,
           author = EXCLUDED.author`,
        [key, val.content, val.timestamp, val.sha, val.author]
      );
    }

    for (const [key, val] of Object.entries(parcleDb.prs)) {
      await client.query(
        `INSERT INTO prs (key, url, sha, title, status, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (key) DO UPDATE SET 
           url = EXCLUDED.url, 
           sha = EXCLUDED.sha, 
           title = EXCLUDED.title, 
           status = EXCLUDED.status, 
           timestamp = EXCLUDED.timestamp`,
        [key, val.url, val.sha, val.title, val.status, val.timestamp]
      );
    }

    await client.query("DELETE FROM v_store");
    for (const doc of parcleDb.v_store) {
      await client.query(
        "INSERT INTO v_store (id, filename, section, content) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
        [doc.id, doc.filename, doc.section, doc.content]
      );
    }

    await client.query("DELETE FROM qa_logs");
    for (const log of parcleDb.qa_logs) {
      await client.query(
        "INSERT INTO qa_logs (query, answer, timestamp, sources) VALUES ($1, $2, $3, $4)",
        [log.query, log.answer, log.timestamp, JSON.stringify(log.sources)]
      );
    }

    for (const [key, val] of Object.entries(parcleDb.clean_patches)) {
      await client.query(
        `INSERT INTO clean_patches (key, file, patch, timestamp, applied) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (key) DO UPDATE SET 
           applied = EXCLUDED.applied`,
        [key, val.file, val.patch, val.timestamp, val.applied]
      );
    }

    await client.query("DELETE FROM pipeline_runs");
    for (const run of parcleDb.pipeline_runs) {
      await client.query(
        "INSERT INTO pipeline_runs (id, name, status, timestamp, log) VALUES ($1, $2, $3, $4, $5)",
        [run.id, run.name, run.status, run.timestamp, run.log]
      );
    }

    await client.query("DELETE FROM routing_events");
    for (const ev of parcleDb.routing_events) {
      await client.query(
        "INSERT INTO routing_events (id, timestamp, event_type, payload, route, confidence, outcome, failed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [ev.id, ev.timestamp, ev.eventType, ev.payload, ev.route, ev.confidence, ev.outcome, ev.failed || false]
      );
    }

    await client.query("COMMIT");
    client.release();
    return true;
  } catch (err) {
    console.error("Neon database save failed", err);
    try {
      const client = await pool.connect();
      await client.query("ROLLBACK");
      client.release();
    } catch (e) {}
    return false;
  }
}

// Load Database and Parcle at startup
(async () => {
  await initDb();
  await loadParcle();
})();

// Lazy Gemini API initialization
let aiClient: any = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY missing. Mock fallback mode active.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Embedder Helper using the specific embedding model
async function generateEmbeddingVec(text: string): Promise<number[]> {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text
    });
    return response.embedding?.values || [];
  } catch (err) {
    console.error("Embedding model retrieval failed", err);
    return [];
  }
}

// Token-Overlap Similarity Utility
function computeTokenOverlap(query: string, text: string): number {
  const qWords = new Set(query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
  const tWords = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  if (qWords.size === 0) return 0;
  
  let matches = 0;
  for (const word of tWords) {
    if (qWords.has(word)) {
      matches++;
    }
  }
  return matches / (Math.sqrt(qWords.size) * Math.sqrt(tWords.length || 1));
}

// -----------------------------------------------------------------------------
// CORE SERVICE API ENDPOINTS
// -----------------------------------------------------------------------------

// System configuration and stats reporting
app.get("/api/sys-info", (req, res) => {
  const readmeFilePath = path.join(process.cwd(), "README.md");
  const readmeExists = fs.existsSync(readmeFilePath);
  const readmeSize = readmeExists ? fs.statSync(readmeFilePath).size : 0;

  res.json({
    status: "success",
    system: {
      cwd: process.cwd(),
      readme_exists: readmeExists,
      readme_size: readmeSize,
      time: new Date().toISOString()
    },
    parcle: {
      db_file: PARCLE_FILE_PATH,
      readmes_count: Object.keys(parcleDb.readmes).length,
      prs_count: Object.keys(parcleDb.prs).length,
      v_store_size: parcleDb.v_store.length,
      qa_logs_count: parcleDb.qa_logs.length,
      patches_count: Object.keys(parcleDb.clean_patches).length,
      pipeline_runs_count: parcleDb.pipeline_runs.length,
      routing_events_count: parcleDb.routing_events.length
    }
  });
});

// Parcle Records Viewer API
app.get("/api/parcle/records", (req, res) => {
  res.json({
    status: "success",
    records: parcleDb
  });
});

// Run real pipeline compiler verification
app.post("/api/pipeline/run", (req, res) => {
  const { name = "Automated Standard Check" } = req.body;
  const id = "pipeline_" + Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toISOString();
  
  exec("npm run lint", { cwd: process.cwd() }, async (error, stdout, stderr) => {
    const status = error ? "failed" : "passed";
    const log = `[${timestamp}] Booting testing framework...\n[${timestamp}] Running typescript compiler check (tsc --noEmit)...\n${stdout}\n${stderr}\n[${timestamp}] Test suite compilation completes. Status: ${status.toUpperCase()}`;

    parcleDb.pipeline_runs.unshift({ id, name, status, timestamp, log });
    await saveParcle();

    res.json({
      id,
      name,
      status,
      timestamp,
      log
    });
  });
});

// Dynamic Code Cleaner AST Static Scan
async function performCleanScan(params: { code?: string; filename?: string; scanWholeWorkspace?: boolean; payload?: string }) {
  let { code, filename = "App.tsx", scanWholeWorkspace = false, payload } = params;

  if (!code && payload) {
    const p = payload.toLowerCase();
    if (p.includes("workspace") || p.includes("all files") || p.includes("project") || p.includes("repo") || p.includes("scan")) {
      scanWholeWorkspace = true;
    } else if (payload.includes("import") || payload.includes("const") || payload.includes("function") || payload.includes("class")) {
      code = payload;
    } else {
      scanWholeWorkspace = true;
    }
  }

  let filesToScan: Array<{ name: string; content: string }> = [];

  if (scanWholeWorkspace) {
    // Scan real files in workspace directories
    const srcDir = path.join(process.cwd(), "src");
    try {
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          const filePath = path.join(srcDir, file);
          if (fs.statSync(filePath).isFile() && (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css"))) {
            filesToScan.push({
              name: `src/${file}`,
              content: fs.readFileSync(filePath, "utf-8")
            });
          }
        }
      }
      // Read main config-related files
      const configFiles = ["package.json", "tsconfig.json", "vite.config.ts"];
      for (const configF of configFiles) {
        const filePath = path.join(process.cwd(), configF);
        if (fs.existsSync(filePath)) {
          filesToScan.push({
            name: configF,
            content: fs.readFileSync(filePath, "utf-8")
          });
        }
      }
    } catch (err) {
      console.error("FileSystem scan error:", err);
    }
  }

  // Fallback or specific file code provided in manual editor
  if (filesToScan.length === 0) {
    filesToScan.push({
      name: filename,
      content: code || `import { useState, useEffect } from 'react';\n\nexport default function App() {\n  const unusedVar = 'hello';\n  return <div>Clean Area</div>;\n}`
    });
  }

  const allIssues: any[] = [];
  
  for (const scanTarget of filesToScan) {
    const fLines = scanTarget.content.split("\n");
    const importedSymbols: Array<{ name: string; line: number }> = [];

    fLines.forEach((line, index) => {
      // 1. Identify Import statements
      const importMatch = line.match(/import\s+(?:({[\w\s,]+})|([\w\d_$]+))\s+from\s+['"](.+)['"]/);
      if (importMatch) {
        if (importMatch[1]) { // destructured imports like { useState, useEffect }
          const syms = importMatch[1].replace(/[{}]/g, "").split(",").map(s => s.trim());
          syms.forEach(sym => {
            if (sym) importedSymbols.push({ name: sym, line: index });
          });
        } else if (importMatch[2]) { // default imports like React
          importedSymbols.push({ name: importMatch[2], line: index });
        }
      }

      // 2. Identify unused local variables
      const varMatch = line.match(/(?:const|let|var)\s+([\w\d_$]+)\s*=/);
      if (varMatch) {
        const varName = varMatch[1].trim();
        if (varName !== "_" && varName !== "__" && !varName.startsWith("unused")) {
          // See if varName matches in other parts of code
          let refCount = 0;
          fLines.forEach((searchLine, sIdx) => {
            if (sIdx !== index && searchLine.includes(varName)) refCount++;
          });
          if (refCount === 0) {
            allIssues.push({
              file: scanTarget.name,
              line: index + 1,
              issue_type: "unused_variable",
              suggestion: `Unused local variable: '${varName}' is assigned a value but never used.`,
              patch_snippet: `@@ -${index+1},1 +${index+1},0 @@\n- ${line}\n+`
            });
          }
        }
      }
    });

    for (const imp of importedSymbols) {
      const regex = getImportRegex(imp.name);
      let count = 0;
      fLines.forEach((searchLine, sIdx) => {
        if (sIdx !== imp.line) {
          const matched = searchLine.match(regex);
          if (matched) count += matched.length;
        }
      });
      if (count === 0 && imp.name !== "React") {
        allIssues.push({
          file: scanTarget.name,
          line: imp.line + 1,
          issue_type: "unused_import",
          suggestion: `Unused import: '${imp.name}' is imported but never referenced.`,
          patch_snippet: `@@ -${imp.line+1},1 +${imp.line+1},1 @@\n- ${fLines[imp.line]}\n+ // Removed unused import '${imp.name}'`
        });
      }
    }
  }

  // Store scan outcome in Parcle memory
  const patchId = `patch_clean_${Date.now()}`;
  const mockPatch = allIssues.map(iss => `File: ${iss.file} (Line ${iss.line})\n${iss.patch_snippet}`).join("\n\n");
  
  parcleDb.clean_patches[patchId] = {
    file: filename,
    patch: mockPatch || "No changes needed. Codebase is clean!",
    timestamp: new Date().toISOString(),
    applied: false,
    issues: allIssues
  };
  await saveParcle();

  return {
    agent: "CLEANER AGENT",
    status: "success",
    result: {
      issues_found: allIssues.length,
      issues: allIssues,
      patch_id: patchId,
      patch: mockPatch
    },
    parcle_write: "success",
    error: null,
    timestamp: new Date().toISOString()
  };
}

app.post("/api/clean/scan", async (req, res) => {
  try {
    const result = await performCleanScan(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ status: "failed", error: err.message });
  }
});

// Apply suggested patches from Cleaner Agent directly on the codebase
app.post("/api/clean/apply", async (req, res) => {
  const { patchId } = req.body;
  const patchData = parcleDb.clean_patches[patchId];
  if (!patchData) {
    return res.status(404).json({ error: "Patch not found", status: "failed" });
  }

  if (patchData.issues && patchData.issues.length > 0) {
    try {
      const filesToUpdate = new Map<string, any[]>();
      for (const iss of patchData.issues) {
        if (!filesToUpdate.has(iss.file)) {
          filesToUpdate.set(iss.file, []);
        }
        filesToUpdate.get(iss.file)!.push(iss);
      }

      for (const [relPath, issues] of filesToUpdate.entries()) {
        const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
        if (fs.existsSync(absPath)) {
          let content = fs.readFileSync(absPath, "utf-8");
          const lines = content.split("\n");
          
          issues.sort((a, b) => b.line - a.line);
          
          for (const iss of issues) {
            const lineIdx = iss.line - 1;
            if (lineIdx >= 0 && lineIdx < lines.length) {
              if (iss.issue_type === "unused_import") {
                lines[lineIdx] = `// Removed unused import: ${lines[lineIdx].trim()}`;
              } else if (iss.issue_type === "unused_variable") {
                lines[lineIdx] = `// Removed unused variable: ${lines[lineIdx].trim()}`;
              }
            }
          }
          
          fs.writeFileSync(absPath, lines.join("\n"), "utf-8");
        }
      }
    } catch (err) {
      console.error("Patch application failed", err);
      return res.status(500).json({ error: "Failed to apply patch on disk", status: "failed" });
    }
  }

  parcleDb.clean_patches[patchId].applied = true;
  await saveParcle();

  res.json({
    agent: "CLEANER AGENT",
    status: "success",
    result: {
      status: "applied",
      msg: "Patch applied successfully. Modified files directly on disk."
    },
    parcle_write: "success"
  });
});

// -----------------------------------------------------------------------------
// WEBHOOK & DOCUMENTATION HELPER ROUTING WITH POPUP APPROVAL
// -----------------------------------------------------------------------------

// Triggers push command simulation
// Triggers push command simulation
async function performWebhook(params: { commitHistory?: string; payload?: string; repoName?: string; author?: string; branch?: string }) {
  const { commitHistory, payload, repoName = "Repository", author = "quack-author", branch = "main" } = params;
  const sha = Math.random().toString(36).substring(2, 10) + "df";
  const timestamp = new Date().toISOString();

  // Create artificial code commit summary or extraction
  const diffStr = commitHistory || payload || `diff --git a/src/App.tsx b/src/App.tsx\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -2,1 +2,2 @@\n-  return <div>Hello</div>;\n+  // Integrated automated tracking\n+  return <div>Hello Realtime Tracked Web app</div>;`;

  // Read current local README.md
  const readmeFilePath = path.join(process.cwd(), "README.md");
  let currentReadme = "";
  try {
    if (fs.existsSync(readmeFilePath)) {
      currentReadme = fs.readFileSync(readmeFilePath, "utf-8");
    } else {
      currentReadme = "# " + repoName + "\nA brand new repository waiting to be automated.";
    }
  } catch (err) {
    currentReadme = "# " + repoName;
  }

  const ai = getAI();
  let updatedMarkdown = "";

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are CodeLore's Documentation Helper Agent. Analyze the file changes described in the Git commit/diff logs, and intelligently rewrite the project's README.md file so that any new modules, installation steps, features, or configurations are updated accurately.
Keep the overall layout pristine.

Diff output:
${diffStr}

Current README.md:
${currentReadme}

Generate the complete, updated format of README.md. Do not include extra conversational preambles. Output only the updated markdown content.`,
        config: {
          systemInstruction: "You are a professional documentation specialist. You write beautiful, human-readable structural markdown files."
        }
      });
      updatedMarkdown = response.text || "";
    } catch (err) {
      console.error("Gemini failed, falling back to simple markdown auto-append", err);
    }
  }

  // Backup simple appending if no AI or failure API
  if (!updatedMarkdown) {
    updatedMarkdown = currentReadme + `\n\n## Update [Commit ${sha}]\nAutomated update triggered by web push. Modified files with change summary:\n\`\`\`\n${diffStr}\n\`\`\``;
  }

  return {
    agent: "DOCUMENTATION HELPER",
    status: "pending_approval",
    result: {
      sha,
      branch,
      author,
      diff: diffStr,
      oldReadme: currentReadme,
      newReadme: updatedMarkdown,
      timestamp
    }
  };
}

app.post("/api/webhook", async (req, res) => {
  try {
    const result = await performWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ status: "failed", error: err.message });
  }
});

// Callback when user hits "Accept & Update" in frontend popup
app.post("/api/approve-readme", async (req, res) => {
  const { sha, content, author = "quack-author", oldContent } = req.body;
  const timestamp = new Date().toISOString();

  // Store original README in Parcle backup archive
  const backupKey = `readme_${sha}_${Date.now()}`;
  parcleDb.readmes[backupKey] = {
    content: oldContent || "# Legacy Sandbox",
    timestamp,
    sha,
    author
  };

  // Write new README.md on local filesystem
  const readmeFilePath = path.join(process.cwd(), "README.md");
  try {
    fs.writeFileSync(readmeFilePath, content, "utf-8");
  } catch (err) {
    console.error("Write local README failed", err);
  }

  // Real Git commit execution and URL resolving
  let realPrUrl = `https://github.com/quack-author/CodeLore/commit/${sha}`;
  try {
    execSync("git add README.md", { cwd: process.cwd() });
    const status = execSync("git status --porcelain README.md", { cwd: process.cwd() }).toString().trim();
    if (status) {
      execSync(`git commit -m "chore: synchronize system documentation [${sha.substring(0, 5)}]"`, { cwd: process.cwd() });
      const commitSha = execSync("git rev-parse HEAD", { cwd: process.cwd() }).toString().trim();
      let remoteUrl = "";
      try {
        remoteUrl = execSync("git config --get remote.origin.url", { cwd: process.cwd() }).toString().trim();
      } catch (e) {}
      if (remoteUrl) {
        const cleanRemote = remoteUrl
          .replace("git@github.com:", "https://github.com/")
          .replace(".git", "");
        realPrUrl = `${cleanRemote}/commit/${commitSha}`;
      }
    }
  } catch (err) {
    console.error("Local Git commit failed", err);
  }

  const prId = `pr_${sha}`;
  parcleDb.prs[prId] = {
    url: realPrUrl,
    sha,
    title: `chore: synchronize system documentation [${sha.substring(0, 5)}]`,
    status: "merged",
    timestamp
  };

  // Dynamically re-index new chunks into Knowledge Base
  // Split the new README.md into vector store chunks
  const sections = content.split(/(?=^##\s+)/m);
  parcleDb.v_store = parcleDb.v_store.filter(item => item.filename !== "README.md");
  
  sections.forEach((sect: string, idx: number) => {
    if (sect.trim()) {
      const headerMatch = sect.match(/^##?\s+(.+)$/m);
      const sectionName = headerMatch ? headerMatch[1] : `Section ${idx + 1}`;
      parcleDb.v_store.push({
        id: `chunk_${sha}_${idx}`,
        filename: "README.md",
        section: sectionName,
        content: sect.trim()
      });
    }
  });

  await saveParcle();

  res.json({
    agent: "DOCUMENTATION HELPER",
    status: "success",
    result: {
      pr_url: realPrUrl,
      sha,
      backup_key: backupKey,
      indexed_chunks: sections.length
    },
    parcle_write: "success",
    timestamp
  });
});

// -----------------------------------------------------------------------------
// KNOWLEDGE BASE AGENT RAG LOGIC
// -----------------------------------------------------------------------------

// KNOWLEDGE BASE AGENT RAG LOGIC
async function performRagQuery(params: { query?: string; payload?: string }) {
  const { query: rawQuery, payload } = params;
  const query = rawQuery || payload;
  if (!query) {
    throw new Error("Missing query");
  }

  // Parcle API RAG Search
  if (process.env.PARCLE_API_KEY) {
    try {
      await ensureParcleUser();
      const response = await fetch("https://api.parcle.ai/v1/memories/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PARCLE_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          user_id: "codelore-user",
          query: query
        })
      });

      if (response.ok) {
        const text = await response.text();
        const lines = text.split("\n");
        let dataObj: any = null;
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.answer) {
                dataObj = parsed;
              }
            } catch (e) {}
          }
        }

        if (dataObj) {
          const finalAnswer = dataObj.answer;
          const sources = (dataObj.citations || []).map((cit: any) => ({
            filename: cit.type === "session" ? "Dialog Session" : "Uploaded File",
            section: cit.id,
            relevance: dataObj.confidence || 1.0
          }));

          const timestamp = new Date().toISOString();
          parcleDb.qa_logs.unshift({
            query,
            answer: finalAnswer,
            timestamp,
            sources
          });
          await saveParcle();

          return {
            agent: "KNOWLEDGE BASE AGENT",
            status: "success",
            result: {
              answer: finalAnswer,
              sources
            },
            parcle_write: "success",
            timestamp
          };
        }
      }
    } catch (err) {
      console.error("Parcle search failed, falling back to local scoring", err);
    }
  }

  // Fallback to local overlap search if Parcle API key missing or query fails
  const chunks = parcleDb.v_store;
  if (chunks.length === 0) {
    return {
      agent: "KNOWLEDGE BASE AGENT",
      status: "failed",
      result: {
        answer: "No documentation found. Has the Documentation Helper run yet?",
        sources: []
      },
      parcle_write: "skipped"
    };
  }

  const scoredChunks = chunks.map(chunk => {
    const score = computeTokenOverlap(query, `${chunk.section} ${chunk.content}`);
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  const topK = scoredChunks.slice(0, 4).filter(item => item.score > 0.05);

  let finalAnswer = "";
  const ai = getAI();

  if (topK.length === 0) {
    finalAnswer = "I don't have enough documentation on this topic in Parcle memory yet. Feel free to trigger a manual repository push to ingest latest notes!";
  } else {
    const contextStr = topK.map(item => `[Source: ${item.chunk.filename} - Section: ${item.chunk.section}]\n${item.chunk.content}`).join("\n\n");
    
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are the Knowledge Base Agent. Answer the user's technical question based EXACTLY on the relevant documentation chunks. Give a concise but highly professional response. Cite your sources clearly.
 
 Relevant documentation context:
 ${contextStr}
 
 User Query: "${query}"`,
          config: {
            systemInstruction: "You are CodeLore Docs documentation helper. You use strict context retrieval to form cited answers."
          }
        });
        finalAnswer = response.text || "Failed to generate text from Gemini.";
      } catch (err) {
        console.error("Gemini context answer failed, falling back to summary of matching sections", err);
      }
    }

    if (!finalAnswer) {
      finalAnswer = `Based on the Parcle vector chunks, I found relevant matches in **${topK[0].chunk.filename}** under the section **"${topK[0].chunk.section}"**. Here is the context:\n\n${topK[0].chunk.content}`;
    }
  }

  const timestamp = new Date().toISOString();
  parcleDb.qa_logs.unshift({
    query,
    answer: finalAnswer,
    timestamp,
    sources: topK.map(item => ({ filename: item.chunk.filename, section: item.chunk.section, relevance: Number(item.score.toFixed(2)) }))
  });
  await saveParcle();

  return {
    agent: "KNOWLEDGE BASE AGENT",
    status: "success",
    result: {
      answer: finalAnswer,
      sources: topK.map(item => ({ filename: item.chunk.filename, section: item.chunk.section, relevance: item.score }))
    },
    parcle_write: "success",
    timestamp
  };
}

app.post("/api/rag/query", async (req, res) => {
  try {
    const result = await performRagQuery(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.message === "Missing query" ? 400 : 500).json({ error: err.message });
  }
});

// Custom Vector chunk addition
app.post("/api/rag/add-chunk", async (req, res) => {
  const { filename, section, content } = req.body;
  if (!filename || !section || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const id = `chunk_custom_${Date.now()}`;
  parcleDb.v_store.push({ id, filename, section, content });
  await saveParcle();

  // Ingest to Parcle Memory API
  if (process.env.PARCLE_API_KEY) {
    try {
      await ensureParcleUser();
      await fetch("https://api.parcle.ai/v1/memories/ingest_dialog", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PARCLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: "codelore-user",
          messages: [
            {
              role: "user",
              content: `File: ${filename}\nSection: ${section}\nContent: ${content}`
            }
          ],
          tag: {
            filename,
            section
          }
        })
      });
    } catch (err) {
      console.error("Failed to ingest chunk to Parcle", err);
    }
  }

  res.json({
    status: "success",
    chunk: { id, filename, section, content }
  });
});

// Helper to classify ambiguous payloads using Gemini or heuristic patterns
async function classifyIntentWithLLM(payload: string): Promise<{ route: string; confidence: number }> {
  const ai = getAI();
  if (!ai) {
    const p = payload.toLowerCase();
    if (p.includes("push") || p.includes("commit") || p.includes("diff") || p.includes("webhook")) {
      return { route: "DOCUMENTATION HELPER", confidence: 0.9 };
    }
    if (p.includes("scan") || p.includes("unused") || p.includes("variable") || p.includes("clean")) {
      return { route: "CLEANER AGENT", confidence: 0.95 };
    }
    if (p.includes("how to") || p.includes("what is") || p.includes("explain") || p.includes("query") || p.includes("question")) {
      return { route: "KNOWLEDGE BASE AGENT", confidence: 0.9 };
    }
    return { route: "UNKNOWN", confidence: 0.2 };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are CodeLore's generalist Orchestrator. Classify this event payload to one of the target specialists: "DOCUMENTATION HELPER", "KNOWLEDGE BASE AGENT", or "CLEANER AGENT".
Payload: "${payload}"

Return JSON matching this schema:
{
  "route": "DOCUMENTATION HELPER" | "KNOWLEDGE BASE AGENT" | "CLEANER AGENT" | "UNKNOWN",
  "confidence": number // float from 0.0 to 1.0
}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const body = JSON.parse(response.text?.trim() || "{}");
    return {
      route: body.route || "UNKNOWN",
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.5
    };
  } catch (e) {
    console.error("LLM classification failed:", e);
    return { route: "UNKNOWN", confidence: 0.0 };
  }
}

// -----------------------------------------------------------------------------
// CENTRAL UNIFIED ORCHESTRATOR ENDPOINT
// -----------------------------------------------------------------------------

app.post("/api/orchestrate", async (req, res) => {
  const { event_type, payload } = req.body;

  if (!payload) {
    return res.status(200).json({
      agent: "ORCHESTRATOR",
      status: "failed",
      error: "empty_payload",
      message: "Provided payload was empty or null.",
      timestamp: new Date().toISOString()
    });
  }

  let route = "UNKNOWN";
  let confidence = 0.5;

  // 1. Classification
  if (event_type === "push") {
    route = "DOCUMENTATION HELPER";
    confidence = 1.0;
  } else if (event_type === "chat_query") {
    route = "KNOWLEDGE BASE AGENT";
    confidence = 1.0;
  } else if (event_type === "scan") {
    route = "CLEANER AGENT";
    confidence = 1.0;
  } else {
    // LLM classification
    const classification = await classifyIntentWithLLM(payload);
    route = classification.route;
    confidence = classification.confidence;
  }

  if (route === "UNKNOWN" || confidence < 0.7) {
    const outcome = "Route failure due to low confidence classification";
    const timestamp = new Date().toLocaleTimeString();
    const eventId = `e_${Date.now()}`;
    
    const newEvent = {
      id: eventId,
      timestamp,
      eventType: event_type === "unknown" ? "ambiguous event" : event_type,
      payload,
      route,
      confidence,
      outcome,
      failed: true
    };
    
    parcleDb.routing_events.unshift(newEvent);
    await saveParcle();

    return res.json({
      agent: "ORCHESTRATOR",
      status: "failed",
      error: "low_confidence_route",
      result: {
        classification: { route, confidence },
        requires_clarification: true,
        clarification_message: `The Orchestrator mapped this request to '${route}' with confidence ${confidence.toFixed(2)}. This is below our 0.7 limit. Please clarify your specific intent.`
      },
      timestamp: new Date().toISOString()
    });
  }

  // 2. Invoke the corresponding agent operation
  let agentResult: any;
  let outcome = "";
  try {
    if (route === "DOCUMENTATION HELPER") {
      agentResult = await performWebhook({ payload });
      outcome = `Readme draft generated for commit SHA ${agentResult.result.sha.substring(0, 7)} pending approval.`;
    } else if (route === "CLEANER AGENT") {
      agentResult = await performCleanScan({ payload });
      outcome = `AST scan completed. Found ${agentResult.result.issues_found} potential issues.`;
    } else {
      agentResult = await performRagQuery({ payload });
      outcome = `RAG query processed successfully. Returned answer citing ${agentResult.result.sources.length} sources.`;
    }

    const timestamp = new Date().toLocaleTimeString();
    const eventId = `e_${Date.now()}`;
    
    const newEvent = {
      id: eventId,
      timestamp,
      eventType: event_type === "unknown" ? "ambiguous event" : event_type,
      payload,
      route,
      confidence,
      outcome,
      failed: false
    };

    parcleDb.routing_events.unshift(newEvent);
    await saveParcle();

    // Return the agent's exact response structure but attach the classification
    return res.json({
      ...agentResult,
      classification: { route, confidence }
    });
  } catch (err: any) {
    console.error("Orchestrator invocation failed:", err);
    const timestamp = new Date().toLocaleTimeString();
    const eventId = `e_${Date.now()}`;
    const newEvent = {
      id: eventId,
      timestamp,
      eventType: event_type === "unknown" ? "ambiguous event" : event_type,
      payload,
      route,
      confidence,
      outcome: `Error: ${err.message}`,
      failed: true
    };
    parcleDb.routing_events.unshift(newEvent);
    await saveParcle();

    return res.status(500).json({
      agent: "ORCHESTRATOR",
      status: "failed",
      error: err.message,
      classification: { route, confidence }
    });
  }
});

app.get("/api/orchestrate/events", (req, res) => {
  res.json({
    status: "success",
    events: parcleDb.routing_events
  });
});

app.get("/api/github/login", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send("GITHUB_CLIENT_ID is not configured in the environment.");
  }
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const redirectUri = `${appUrl}/api/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
  res.redirect(githubAuthUrl);
});

app.get("/api/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("GitHub client ID or secret is not configured.");
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(400).send(`GitHub OAuth exchange error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).send("Failed to retrieve access token from GitHub.");
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Authentication Success</title></head>
        <body style="background:#090d16;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">
          <div style="text-align:center;">
            <p style="font-size:14px;margin-bottom:8px;">Authentication successful!</p>
            <p style="font-size:12px;color:#64748b;">Closing flow context...</p>
          </div>
          <script>
            localStorage.setItem("github_token", "${accessToken}");
            window.location.href = "/";
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("OAuth exchange failed:", err);
    res.status(500).send(`OAuth callback error: ${err.message}`);
  }
});

// Serving React Application frontend with Vite setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully booted on port ${PORT}`);
  });
}

startServer();
