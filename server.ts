/* eslint-disable react-doctor/async-parallel, react-doctor/async-await-in-loop */
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
  metadata: Record<string, any>;
} = {
  readmes: {},
  prs: {},
  v_store: [],
  qa_logs: [],
  clean_patches: {},
  pipeline_runs: [],
  routing_events: [],
  metadata: {}
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
        const parsed = JSON.parse(data);
        parcleDb = {
          ...parcleDb,
          ...parsed,
          metadata: parsed.metadata || {}
        };
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

    await Promise.all(Object.entries(parcleDb.readmes).map(([key, val]) =>
      client.query(
        `INSERT INTO readmes (key, content, timestamp, sha, author) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (key) DO UPDATE SET
           content = EXCLUDED.content,
           timestamp = EXCLUDED.timestamp,
           sha = EXCLUDED.sha,
           author = EXCLUDED.author`,
        [key, val.content, val.timestamp, val.sha, val.author]
      )
    ));

    await Promise.all(Object.entries(parcleDb.prs).map(([key, val]) =>
      client.query(
        `INSERT INTO prs (key, url, sha, title, status, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (key) DO UPDATE SET 
           url = EXCLUDED.url, 
           sha = EXCLUDED.sha, 
           title = EXCLUDED.title, 
           status = EXCLUDED.status, 
           timestamp = EXCLUDED.timestamp`,
        [key, val.url, val.sha, val.title, val.status, val.timestamp]
      )
    ));

    await client.query("DELETE FROM v_store");
    await Promise.all(parcleDb.v_store.map(doc =>
      client.query(
        "INSERT INTO v_store (id, filename, section, content) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
        [doc.id, doc.filename, doc.section, doc.content]
      )
    ));

    await client.query("DELETE FROM qa_logs");
    await Promise.all(parcleDb.qa_logs.map(log =>
      client.query(
        "INSERT INTO qa_logs (query, answer, timestamp, sources) VALUES ($1, $2, $3, $4)",
        [log.query, log.answer, log.timestamp, JSON.stringify(log.sources)]
      )
    ));

    await Promise.all(Object.entries(parcleDb.clean_patches).map(([key, val]) =>
      client.query(
        `INSERT INTO clean_patches (key, file, patch, timestamp, applied) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (key) DO UPDATE SET 
           applied = EXCLUDED.applied`,
        [key, val.file, val.patch, val.timestamp, val.applied]
      )
    ));

    await client.query("DELETE FROM pipeline_runs");
    await Promise.all(parcleDb.pipeline_runs.map(run =>
      client.query(
        "INSERT INTO pipeline_runs (id, name, status, timestamp, log) VALUES ($1, $2, $3, $4, $5)",
        [run.id, run.name, run.status, run.timestamp, run.log]
      )
    ));

    await client.query("DELETE FROM routing_events");
    await Promise.all(parcleDb.routing_events.map(ev =>
      client.query(
        "INSERT INTO routing_events (id, timestamp, event_type, payload, route, confidence, outcome, failed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [ev.id, ev.timestamp, ev.eventType, ev.payload, ev.route, ev.confidence, ev.outcome, ev.failed || false]
      )
    ));

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
  await indexLocalRepository();
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

async function indexLocalRepository() {
  console.log("Starting automatic repository indexing...");
  try {
    const owner = getGitOwner();
    const context = parcleDb.metadata?.["orchestrator:active_repo_context"] || {
      active_repo: "custom-docs",
      active_branch: "main",
      last_indexed_file: "README.md"
    };
    const repo = context.active_repo || "custom-docs";
    const branch = context.active_branch || "main";

    const filesToScan: string[] = ["README.md", "server.ts", "src/App.tsx", "src/types.ts"];
    
    // Scan src/components/
    const componentsDir = path.join(process.cwd(), "src", "components");
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir);
      for (const file of files) {
        if (file.endsWith(".tsx") || file.endsWith(".ts")) {
          filesToScan.push(`src/components/${file}`);
        }
      }
    }

    const timestamp = new Date().toISOString();

    for (const filePath of filesToScan) {
      const absPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(absPath)) continue;

      const rawContent = fs.readFileSync(absPath, "utf-8");
      const lines = rawContent.split(/\r?\n/);
      let currentHeader = "Overview";
      let currentBodyLines: string[] = [];
      const rawChunks: Array<{ header: string; body: string }> = [];

      const finalizeChunk = () => {
        const body = currentBodyLines.join("\n").trim();
        if (body) {
          rawChunks.push({ header: currentHeader, body });
        }
        currentBodyLines = [];
      };

      for (const line of lines) {
        const headerMatch = line.match(/^(###?)\s+(.+)$/);
        if (headerMatch) {
          finalizeChunk();
          currentHeader = headerMatch[2].trim();
        } else {
          currentBodyLines.push(line);
        }
      }
      finalizeChunk();

      const finalChunks: Array<{ filename: string; header: string; body: string; source_url: string; timestamp: string; branch: string }> = [];
      const source_url = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;

      for (const chunk of rawChunks) {
        const words = chunk.body.split(/\s+/).filter(Boolean);
        if (words.length > 400) {
          const paragraphs = chunk.body.split(/\n\n+/);
          let tempParagraphs: string[] = [];
          let tempWordsCount = 0;
          let subIndex = 1;

          for (const para of paragraphs) {
            const paraWords = para.split(/\s+/).filter(Boolean).length;
            if (tempWordsCount + paraWords > 400) {
              if (tempParagraphs.length > 0) {
                finalChunks.push({
                  filename: filePath,
                  header: chunk.header + ` (Part ${subIndex})`,
                  body: tempParagraphs.join("\n\n"),
                  source_url,
                  timestamp,
                  branch
                });
                subIndex++;
              }
              tempParagraphs = [para];
              tempWordsCount = paraWords;
            } else {
              tempParagraphs.push(para);
              tempWordsCount += paraWords;
            }
          }
          if (tempParagraphs.length > 0) {
            finalChunks.push({
              filename: filePath,
              header: chunk.header + (subIndex > 1 ? ` (Part ${subIndex})` : ""),
              body: tempParagraphs.join("\n\n"),
              source_url,
              timestamp,
              branch
            });
          }
        } else {
          finalChunks.push({
            filename: filePath,
            header: chunk.header,
            body: chunk.body,
            source_url,
            timestamp,
            branch
          });
        }
      }

      const slugify = (text: string) => {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      };

      for (const chunk of finalChunks) {
        const headerSlug = slugify(chunk.header);
        const key = `kb:${repo}:${filePath}:${headerSlug}`;
        const embedding = await generateEmbeddingVec(`${chunk.header}\n${chunk.body}`);
        
        const newValue = {
          text: chunk.body,
          header: chunk.header,
          filename: chunk.filename,
          embedding,
          source_url: chunk.source_url,
          indexed_at: timestamp
        };

        if (parcleDb.metadata[key]) {
          parcleDb.metadata[`${key}:prev`] = parcleDb.metadata[key];
        }
        parcleDb.metadata[key] = newValue;
      }

      // Update manifest
      const manifestKey = "kb:index:manifest";
      const manifestData = parcleDb.metadata[manifestKey];
      let manifest: any[] = [];
      if (Array.isArray(manifestData)) {
        manifest = manifestData;
      } else if (manifestData && typeof manifestData === "object" && Array.isArray(manifestData.files)) {
        manifest = manifestData.files;
      }
      
      manifest = manifest.filter((entry: any) => entry.filename !== filePath);
      manifest.push({
        filename: filePath,
        chunk_count: finalChunks.length,
        indexed_at: timestamp
      });
      
      const totalChunks = manifest.reduce((acc: number, entry: any) => acc + (entry.chunk_count || 0), 0);
      
      parcleDb.metadata[manifestKey] = {
        repo_name: repo,
        chunk_count: totalChunks,
        files: manifest
      };
    }

    await saveParcle();
    console.log("Local repository indexed successfully.");
  } catch (err) {
    console.error("Local repository indexing failed:", err);
  }
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
// CLEANER AGENT V2 — FULL STATIC ANALYSIS ENGINE
// -----------------------------------------------------------------------------

// Lightweight .gitignore glob-to-regex converter
function globToRegex(pattern: string): RegExp {
  let neg = false;
  let p = pattern.trim();
  if (!p || p.startsWith('#')) return /(?!)/; // never matches
  if (p.startsWith('!')) { neg = true; p = p.slice(1); }
  p = p.replace(/\/$/, '');
  let regexStr = p
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  if (!p.includes('/')) {
    regexStr = '(^|.*/)'+ regexStr + '(/.*)?$';
  } else {
    regexStr = '^' + regexStr + '(/.*)?$';
  }
  return new RegExp(regexStr);
}

const HARDCODED_IGNORES = [
  'node_modules/', '.git/', 'dist/', 'build/', '.next/', '__pycache__/',
  '*.lock', '*.log', '*.env', '*.min.js', '*.min.css', 'coverage/'
];

function isPathIgnored(filePath: string, ignorePatterns: RegExp[]): boolean {
  for (const regex of ignorePatterns) {
    if (regex.test(filePath)) return true;
  }
  return false;
}

// GET /api/cleaner/tree — Fetch project tree from GitHub with ignore filtering
app.get("/api/cleaner/tree", async (req, res) => {
  try {
    if (!parcleDb.metadata) parcleDb.metadata = {};
    const context = parcleDb.metadata["orchestrator:active_repo_context"] || {
      active_repo: "custom-docs", active_branch: "main"
    };
    const owner = getGitOwner();
    const repo = context.active_repo || "custom-docs";
    const branch = context.active_branch || "main";

    const headers: Record<string, string> = {
      "User-Agent": "CodeLore-App",
      "Accept": "application/vnd.github.v3+json"
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch tree
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers });
    if (!treeRes.ok) {
      return res.status(treeRes.status).json({ error: `GitHub tree fetch failed: ${treeRes.statusText}` });
    }
    const treeData = await treeRes.json();
    const rawTree = (treeData.tree || []) as Array<{ path: string; type: string; size?: number; sha: string }>;

    // Fetch .gitignore
    let gitignorePatterns: RegExp[] = [];
    try {
      const giUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.gitignore?ref=${branch}`;
      const giRes = await fetch(giUrl, { headers });
      if (giRes.ok) {
        const giData = await giRes.json();
        if (giData.content) {
          const giContent = Buffer.from(giData.content, giData.encoding || 'base64').toString('utf8');
          const lines = giContent.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
          gitignorePatterns = lines.map(l => globToRegex(l));
        }
      }
    } catch (e) { /* .gitignore is optional */ }

    // Add hardcoded ignores
    const hardcodedRegexes = HARDCODED_IGNORES.map(p => globToRegex(p));
    const allIgnorePatterns = [...gitignorePatterns, ...hardcodedRegexes];

    let ignoredCount = 0;
    const tree = rawTree.map(node => {
      const ignored = isPathIgnored(node.path, allIgnorePatterns);
      if (ignored) ignoredCount++;
      return {
        path: node.path,
        type: node.type as 'blob' | 'tree',
        size: node.size,
        sha: node.sha,
        ignored
      };
    });

    res.json({
      status: "success",
      tree,
      total_count: tree.filter(n => n.type === 'blob').length,
      ignored_count: ignoredCount,
      repo,
      branch,
      owner
    });
  } catch (err: any) {
    console.error("Cleaner tree fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cleaner/file-content — Fetch raw file content from GitHub
app.get("/api/cleaner/file-content", async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "Missing path" });

    if (!parcleDb.metadata) parcleDb.metadata = {};
    const context = parcleDb.metadata["orchestrator:active_repo_context"] || {
      active_repo: "custom-docs", active_branch: "main"
    };
    const owner = getGitOwner();
    const repo = context.active_repo || "custom-docs";
    const branch = context.active_branch || "main";

    const headers: Record<string, string> = {
      "User-Agent": "CodeLore-App",
      "Accept": "application/vnd.github.v3+json"
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    const ghRes = await fetch(url, { headers });
    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: `GitHub file fetch failed: ${ghRes.statusText}` });
    }
    const data = await ghRes.json();
    if (!data.content) {
      return res.status(400).json({ error: "No content in file" });
    }
    const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf8');
    res.json({ status: "success", content, sha: data.sha, size: data.size });
  } catch (err: any) {
    console.error("Cleaner file content error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cleaner/scan — Gemini-powered 6-category analysis with concurrency control
app.post("/api/cleaner/scan", async (req, res) => {
  try {
    const { files, repo } = req.body as { files: Array<{ path: string; sha: string }>; repo: string };
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "Missing files array" });
    }

    if (!parcleDb.metadata) parcleDb.metadata = {};
    const context = parcleDb.metadata["orchestrator:active_repo_context"] || {
      active_repo: "custom-docs", active_branch: "main"
    };
    const owner = getGitOwner();
    const repoName = repo || context.active_repo || "custom-docs";
    const branch = context.active_branch || "main";

    // Read existing patch log to skip already-fixed issues
    const patchLogKey = `cleaner:patch_log:${repoName}`;
    const patchLog: any[] = Array.isArray(parcleDb.metadata[patchLogKey]) ? parcleDb.metadata[patchLogKey] : [];

    const headers: Record<string, string> = {
      "User-Agent": "CodeLore-App",
      "Accept": "application/vnd.github.v3+json"
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const ai = getAI();
    const allIssues: any[] = [];
    let cacheHits = 0;

    // Semaphore for max 5 concurrent Gemini calls
    const MAX_CONCURRENT = 5;
    let running = 0;
    const queue: Array<() => Promise<void>> = [];

    const runNext = () => {
      while (running < MAX_CONCURRENT && queue.length > 0) {
        running++;
        const task = queue.shift()!;
        task().finally(() => {
          running--;
          runNext();
        });
      }
    };

    const scanPromises: Promise<void>[] = [];

    for (const file of files) {
      const cacheKey = `cleaner:file_cache:${repoName}:${file.path}:${file.sha}`;

      // Check cache
      if (parcleDb.metadata[cacheKey]) {
        const cached = parcleDb.metadata[cacheKey];
        if (Array.isArray(cached.issues)) {
          allIssues.push(...cached.issues);
          cacheHits++;
          continue;
        }
      }

      const p = new Promise<void>((resolve) => {
        const task = async () => {
          try {
            // Fetch file content
            const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}?ref=${branch}`;
            const ghRes = await fetch(url, { headers });
            if (!ghRes.ok) { resolve(); return; }
            const data = await ghRes.json();
            if (!data.content) { resolve(); return; }
            const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf8');

            let issues: any[] = [];

            if (ai) {
              try {
                const response = await ai.models.generateContent({
                  model: "gemini-2.0-flash",
                  contents: `File: ${file.path}\nContent:\n${content}`,
                  config: {
                    systemInstruction: `You are a senior code reviewer. Analyze the provided source file and return a JSON array of issues only — no prose, no markdown. Each issue must follow this schema:
{
  "category": "unused_import" | "syntax_error" | "performance" | "security" | "srp" | "readability",
  "severity": "error" | "warning" | "suggestion",
  "title": "string (max 60 chars)",
  "description": "string (max 120 chars)",
  "file": "string",
  "line_start": number,
  "line_end": number,
  "fix_snippet": "string | null (provide corrected code if fix is straightforward)"
}

CATEGORY RULES:
UNUSED_IMPORT: Any import not referenced anywhere in the file body. Named imports where only some members are used (flag the unused members specifically). Default imports that are never called/rendered.
SYNTAX_ERROR: Missing semicolons (if file uses them consistently). Unclosed brackets/parentheses/tags. Type errors (TS files): mismatched types, missing return types on exported functions. Undefined variables used before declaration.
PERFORMANCE: useEffect with missing/wrong dependency arrays (React). Expensive operations inside render/return blocks. Unnecessary re-renders (inline object/function creation in JSX props). Missing useMemo/useCallback where clearly beneficial. Synchronous file reads or blocking I/O.
SECURITY: Hardcoded secrets, tokens, passwords, API keys. dangerouslySetInnerHTML usage (XSS risk). eval() or Function() calls. Unvalidated user input passed to SQL/shell/exec. console.log() left in production code with sensitive data.
SRP (Single Responsibility): Functions > 40 lines doing multiple distinct tasks. Components that fetch data AND render AND handle form logic. Files > 200 lines mixing unrelated concerns.
READABILITY: Variable names: single-letter (except loop counters), cryptic abbreviations, misleading names. Magic numbers/strings not assigned to named constants. Deeply nested if/else (> 3 levels) that could be early-returned or extracted. Missing JSDoc/docstrings on exported functions. Dead code (unreachable code after return/throw).

Return [] if no issues found. Never return null. Return ONLY valid JSON — no markdown fences, no backticks, no prose.`
                  }
                });
                const text = (response.text || "").trim();
                // Parse the JSON from the response — strip markdown fences if present
                let jsonStr = text;
                const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
                if (fenceMatch) jsonStr = fenceMatch[1].trim();
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (Array.isArray(parsed)) {
                    issues = parsed.map((iss: any) => ({
                      ...iss,
                      file: file.path
                    }));
                  }
                } catch (parseErr) {
                  console.error(`Failed to parse Gemini response for ${file.path}:`, parseErr);
                }
              } catch (gemErr) {
                console.error(`Gemini scan failed for ${file.path}:`, gemErr);
              }
            }

            // Filter out already-patched issues
            const filteredIssues = issues.filter((iss: any) => {
              return !patchLog.some((patch: any) =>
                patch.file === iss.file &&
                patch.line_start === iss.line_start &&
                patch.title === iss.title
              );
            });

            // Cache results
            parcleDb.metadata[cacheKey] = { issues: filteredIssues, cached_at: new Date().toISOString() };
            allIssues.push(...filteredIssues);
          } catch (err) {
            console.error(`Scan error for ${file.path}:`, err);
          }
          resolve();
        };
        queue.push(task);
      });
      scanPromises.push(p);
    }

    // Start the semaphore
    runNext();
    await Promise.all(scanPromises);

    // Write scan results to Parcle
    const timestamp = new Date().toISOString();
    parcleDb.metadata[`cleaner:scan:${repoName}:${timestamp}`] = allIssues;
    parcleDb.metadata[`cleaner:last_scan:${repoName}`] = {
      timestamp,
      total_issues: allIssues.length,
      files_scanned: files.length,
      resolved_count: 0
    };
    await saveParcle();

    res.json({
      status: "success",
      issues: allIssues,
      files_scanned: files.length,
      cache_hits: cacheHits,
      timestamp
    });
  } catch (err: any) {
    console.error("Cleaner scan error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cleaner/apply-fix — Apply a single fix via GitHub API commit
app.post("/api/cleaner/apply-fix", async (req, res) => {
  try {
    const { file: filePath, fix_snippet, line_start, line_end, category, title, repo, branch: reqBranch } = req.body;
    if (!filePath || !fix_snippet) {
      return res.status(400).json({ error: "Missing file or fix_snippet" });
    }

    if (!parcleDb.metadata) parcleDb.metadata = {};
    const context = parcleDb.metadata["orchestrator:active_repo_context"] || {
      active_repo: "custom-docs", active_branch: "main"
    };
    const owner = getGitOwner();
    const repoName = repo || context.active_repo || "custom-docs";
    const branch = reqBranch || context.active_branch || "main";

    const headers: Record<string, string> = {
      "User-Agent": "CodeLore-App",
      "Accept": "application/vnd.github.v3+json"
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch current file
    const getUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${branch}`;
    const getRes = await fetch(getUrl, { headers });
    if (!getRes.ok) {
      return res.status(getRes.status).json({ error: `Failed to fetch file: ${getRes.statusText}` });
    }
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, fileData.encoding || 'base64').toString('utf8');
    const lines = currentContent.split('\n');

    // Replace lines line_start to line_end with fix_snippet
    const before = lines.slice(0, (line_start || 1) - 1);
    const after = lines.slice(line_end || line_start || 1);
    const newContent = [...before, fix_snippet, ...after].join('\n');
    const encodedContent = Buffer.from(newContent).toString('base64');

    // Commit via GitHub API
    const commitMessage = `fix(${category || 'code'}): ${title || 'code cleanup'} — by CodeLore Cleaner`;
    const putUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMessage,
        content: encodedContent,
        sha: fileData.sha,
        branch
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(putRes.status).json({ error: `GitHub commit failed: ${errText}` });
    }

    // Append to patch log in Parcle
    const patchLogKey = `cleaner:patch_log:${repoName}`;
    if (!Array.isArray(parcleDb.metadata[patchLogKey])) {
      parcleDb.metadata[patchLogKey] = [];
    }
    parcleDb.metadata[patchLogKey].push({
      file: filePath,
      line_start,
      line_end,
      category,
      title,
      fix_snippet,
      timestamp: new Date().toISOString(),
      commit_message: commitMessage
    });
    await saveParcle();

    res.json({ status: "success", commit_message: commitMessage });
  } catch (err: any) {
    console.error("Cleaner apply-fix error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cleaner/patch-log — Read patch log from Parcle
app.get("/api/cleaner/patch-log", (req, res) => {
  const repo = (req.query.repo as string) || "custom-docs";
  if (!parcleDb.metadata) parcleDb.metadata = {};
  const patchLogKey = `cleaner:patch_log:${repo}`;
  const log = Array.isArray(parcleDb.metadata[patchLogKey]) ? parcleDb.metadata[patchLogKey] : [];
  const lastScan = parcleDb.metadata[`cleaner:last_scan:${repo}`] || null;
  res.json({ status: "success", log, last_scan: lastScan });
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
        model: "gemini-2.0-flash",
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

  if (!parcleDb.metadata) {
    parcleDb.metadata = {};
  }
  if (!parcleDb.metadata["orchestrator:active_repo_context"]) {
    parcleDb.metadata["orchestrator:active_repo_context"] = {
      active_repo: "custom-docs",
      active_branch: "main",
      last_indexed_file: "README.md"
    };
  }
  parcleDb.metadata["orchestrator:active_repo_context"].last_indexed_file = "README.md";

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
// OVERHAULED AI README GENERATOR ENDPOINTS
// -----------------------------------------------------------------------------

// Fetch README.md from remote GitHub repository
app.get("/api/github/readme", async (req, res) => {
  const { token, repo } = req.query;
  if (!token || !repo) {
    return res.status(400).json({ error: "Missing token or repo parameter" });
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/README.md`, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "CodeLore"
      }
    });
    if (response.status === 404) {
      return res.json({ exists: false });
    }
    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }
    const data: any = await response.json();
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    res.json({ exists: true, content: decoded, sha: data.sha });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch README" });
  }
});

// Delete README.md from remote GitHub repository
app.post("/api/github/delete-readme", async (req, res) => {
  const { token, repo, sha, message = "chore: delete README.md" } = req.body;
  if (!token || !repo || !sha) {
    return res.status(400).json({ error: "Missing token, repo, or sha" });
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/README.md`, {
      method: "DELETE",
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "CodeLore",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, sha })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API returned status ${response.status}: ${errorText}`);
    }
    res.json({ status: "success" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete README" });
  }
});

// Map to cache generated project logos: repo -> base64ImageBytes
const generatedLogos = new Map<string, string>();

// GET /api/readme/logo — Serve cached base64 project logo as binary image
app.get("/api/readme/logo", (req, res) => {
  const repo = req.query.repo as string;
  if (!repo) {
    return res.status(400).send("Missing repo query parameter");
  }
  const base64Str = generatedLogos.get(repo);
  if (!base64Str) {
    return res.status(404).send("Logo not found");
  }
  try {
    const buffer = Buffer.from(base64Str, "base64");
    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send("Failed to decode image");
  }
});

// Beautiful CodeLore SVG logo generator
function getCodeLoreLogo(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF4B4B;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" rx="20" fill="#0F172A"/>
    <g transform="translate(30, 25)">
      <!-- Beautiful CodeLore Logo Mark -->
      <path d="M 0 35 L 20 15 L 40 35 L 20 55 Z" fill="none" stroke="url(#grad)" stroke-width="4" stroke-linejoin="round"/>
      <path d="M 12 35 L 20 27 L 28 35 L 20 43 Z" fill="url(#grad)"/>
      <circle cx="20" cy="35" r="3" fill="#F8FAFC"/>
    </g>
    <!-- Text Elements -->
    <text x="100" y="62" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="#F8FAFC" letter-spacing="1.5">CodeLore</text>
    <text x="100" y="85" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#94A3B8" letter-spacing="3">AI DOCUMENTATION ENGINE</text>
  </svg>`;
  return Buffer.from(svg).toString("base64");
}

// Format repository name to proper project name
function getProperProjectName(repoName: string): string {
  if (!repoName) return "Project";
  return repoName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const TEXT_EXTENSIONS = new Set([".sh", ".json", ".py", ".js", ".ts", ".yml", ".yaml", ".txt", ".md", ".cfg", ".ini", ".toml"]);

// Recursively traverse cloned repo to gather files and contents
function getRepositoryContext(dir: string): { fileTree: string; fileContents: string } {
  const files: string[] = [];
  const contentsMap: Record<string, string> = {};
  
  const walk = (currentDir: string) => {
    const list = fs.readdirSync(currentDir);
    for (const item of list) {
      const fullPath = path.join(currentDir, item);
      const relPath = path.relative(dir, fullPath);
      
      if (
        relPath.startsWith(".git") || 
        relPath.includes("node_modules") || 
        relPath.includes(".venv") || 
        relPath.includes("dist") || 
        relPath.includes("build")
      ) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(relPath);
        const ext = path.extname(item).toLowerCase();
        const isTextFile = TEXT_EXTENSIONS.has(ext);
        if (isTextFile && stat.size < 30000) {
          try {
            contentsMap[relPath] = fs.readFileSync(fullPath, "utf-8");
          } catch (e) {}
        }
      }
    }
  };
  
  walk(dir);
  const fileTree = files.join("\n");
  const fileContents = Object.entries(contentsMap)
    .map(([file, content]) => `--- File: ${file} ---\n${content}`)
    .join("\n\n");
  return { fileTree, fileContents };
}

// Run local readme-ai command on cloned remote repository code and post-process with Gemini
app.post("/api/readme/generate", async (req, res) => {
  const { token, repo, repoName, align, badgeStyle, headerStyle, navigationStyle, emojis } = req.body;
  if (!token || !repo) {
    return res.status(400).json({ error: "Missing token or repo" });
  }

  const tempDir = path.join(process.cwd(), "tmp", `repo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Clone repo depth 1
    execSync(`git clone --depth 1 https://x-token-auth:${token}@github.com/${repo}.git ${tempDir}`, { stdio: "ignore" });
    
    // Write ignore file
    fs.writeFileSync(path.join(tempDir, ".readmeaiignore"), `.git/\nnode_modules/\n.venv/\ndist/\nbuild/\n.env\n`, "utf-8");

    const readmeaiPath = path.join(process.cwd(), ".venv", "bin", "readmeai");
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    
    const cmd = `"${readmeaiPath}" --repository "${tempDir}" --output "${tempDir}/README_GEN.md" --api gemini --model gemini-1.5-flash --align ${align || "center"} --badge-style ${badgeStyle || "default"} --header-style ${headerStyle || "classic"} --navigation-style ${navigationStyle || "bullet"} --emojis ${emojis || "default"}`;

    try {
      if (!apiKey) throw new Error("No Gemini API key available");
      execSync(cmd, { env: { ...process.env, GEMINI_API_KEY: apiKey, GOOGLE_API_KEY: apiKey } });
    } catch (apiErr: any) {
      console.warn("Generating readme-ai in offline fallback mode:", apiErr.message);
      const offlineCmd = cmd.replace("--api gemini --model gemini-1.5-flash", "--api offline");
      execSync(offlineCmd);
    }

    const genPath = path.join(tempDir, "README_GEN.md");
    if (!fs.existsSync(genPath)) {
      throw new Error("README generation failed to create output file");
    }

    const content = fs.readFileSync(genPath, "utf-8");
    
    // Step 1: Cache static CodeLore logo image
    const logoBase64 = getCodeLoreLogo();
    generatedLogos.set(repo, logoBase64);

    // Step 2: Post-process generated README using Gemini and repository files context
    const ai = getAI();
    let finalMarkdown = content;
    if (ai) {
      try {
        const repoCtx = getRepositoryContext(tempDir);
        const rewriteResponse = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `You are an expert README generator. Re-write the following draft README file to make it perfect, professional, and fully completed.
Follow these rules strictly:
1. Project Name: Format the repository name "${repoName || repo.split("/")[1]}" properly without special symbols or underscores (e.g. easy_deploy becomes "Easy Deploy", repo_1782114619665_nj2br becomes "Repo 1782114619665 Nj2br").
2. Logo: Include the project logo at the top using this exact HTML tag (do not change or modify the URL):
   <img src="/api/readme/logo?repo=${encodeURIComponent(repo)}" align="center" width="150" alt="Project Logo"/>
3. Overview: Analyze the repository files and write a comprehensive, high-quality, professional project overview. No empty sections or "no data" bugs allowed.
4. Features: Document the actual features of the project based on the repository content. No placeholders like "❯ REPLACE-ME" or "REPLACE-ME" allowed.
5. Project Structure: Display the tree/structure of the repository. Use the actual GitHub repository path "${repo}" as the root folder.
6. Project Index: Ensure it refers to the proper name or GitHub path, not REPO_1782114619665_NJ2BR or placeholder root strings.
7. Installation: Write the actual, concrete installation instructions based on the repo configuration (e.g. if you see package.json, use npm install; if you see python files, use pip install; if you see deploy.sh, describe how to make it executable and run it). No placeholders (like 'INSERT-INSTALL-COMMAND-HERE' or 'echo ...') allowed.
8. Usage & Running: Write the actual run commands (e.g. if it's a shell script, run "./deploy.sh"). No placeholders (like 'INSERT-RUN-COMMAND-HERE' or 'echo ...') allowed.
9. Testing: Write the actual test command or suite run command. If there is no test framework found in the codebase, describe how to run or validate the script manually. No placeholders (like 'INSERT-TEST-COMMAND-HERE' or '{test_framework}') allowed.
10. Roadmap: Create a Roadmap section. It must list exactly:
    - 1 completed task that is struck off (e.g. "- [x] ~~Task name~~")
    - 2 future features that are yet to be implemented (e.g. "- [ ] Feature name 1", "- [ ] Feature name 2")
    Make these features realistic and directly relevant to the repository's files.
11. Overall: Absolutely no placeholders, no "echo 'INSERT...'", no "REPLACE-ME", no templates text left. Every single section must contain real, customized, complete information.

Here is the repository context:
=== FILE LIST ===
${repoCtx.fileTree}

=== FILE CONTENTS ===
${repoCtx.fileContents}

=== DRAFT README FROM README-AI ===
${content}

Output only the updated, complete README markdown content. Do not include any conversational preamble or markdown code blocks wrap outside of the markdown itself.`,
          config: {
            systemInstruction: "You edit and improve README.md files to make them complete, realistic, professional, and free of placeholders, based on codebase analysis."
          }
        });
        if (rewriteResponse.text) {
          finalMarkdown = rewriteResponse.text.trim();
          // Remove markdown wrappers if any
          const fenceMatch = finalMarkdown.match(/```(?:markdown)?\s*\n?([\s\S]*?)\n?```/i);
          if (fenceMatch) {
            finalMarkdown = fenceMatch[1].trim();
          }
        }
      } catch (geminiErr: any) {
        console.error("Gemini post-processing rewrite failed:", geminiErr);
      }
    }

    res.json({ status: "success", content: finalMarkdown });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate README" });
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Cleanup failed", e);
    }
  }
});

// Edit/refine generated README via Gemini LLM using instructions
app.post("/api/readme/modify", async (req, res) => {
  const { content, instruction } = req.body;
  if (!content || !instruction) {
    return res.status(400).json({ error: "Missing content or instruction" });
  }
  
  const ai = getAI();
  if (!ai) {
    return res.status(500).json({ error: "Gemini AI client not initialized" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are a professional documentation editor. Modify the following README markdown content based on the user's instructions.
      
Current README:
${content}

User Instructions:
${instruction}

Output only the updated complete README markdown content. Do not include any conversational preamble or markdown code blocks wraps outside of the markdown itself.`,
      config: {
        systemInstruction: "You edit markdown documents directly. You output only the edited document content with no conversational text."
      }
    });

    res.json({ status: "success", content: response.text || content });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to refine README" });
  }
});

// Push/write README.md to remote GitHub repository
app.post("/api/github/push-readme", async (req, res) => {
  const { token, repo, content, sha, message = "chore: update README.md" } = req.body;
  if (!token || !repo || !content) {
    return res.status(400).json({ error: "Missing token, repo, or content" });
  }

  try {
    let finalContent = content;
    const base64Logo = generatedLogos.get(repo);
    if (base64Logo) {
      // Replace the local logo endpoint URL references with relative path to logo.png
      finalContent = content.replace(/\/api\/readme\/logo\?repo=[^"'\s)>]+/g, "./logo.png");

      // Check if logo.png already exists on GitHub to obtain its SHA
      let logoSha: string | undefined;
      try {
        const logoGetRes = await fetch(`https://api.github.com/repos/${repo}/contents/logo.png`, {
          headers: {
            Authorization: `token ${token}`,
            "User-Agent": "CodeLore"
          }
        });
        if (logoGetRes.ok) {
          const logoData: any = await logoGetRes.json();
          logoSha = logoData.sha;
        }
      } catch (e) {
        console.warn("Failed to check logo.png existence on GitHub:", e);
      }

      // Upload logo.png to GitHub repository
      const logoPutRes = await fetch(`https://api.github.com/repos/${repo}/contents/logo.png`, {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "User-Agent": "CodeLore",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "chore: upload project logo image",
          content: base64Logo,
          sha: logoSha
        })
      });
      if (!logoPutRes.ok) {
        const logoErr = await logoPutRes.text();
        console.warn("Failed to upload project logo:", logoErr);
      }
    }

    const base64Content = Buffer.from(finalContent, "utf-8").toString("base64");
    const body: any = {
      message,
      content: base64Content
    };
    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/README.md`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "CodeLore",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API returned status ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    res.json({ status: "success", commit: data.commit });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to push README to GitHub" });
  }
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
          model: "gemini-2.0-flash",
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

// Cosine similarity helper
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// GitHub -> Parcle Ingestion Endpoint
app.post("/api/kb/ingest", async (req, res) => {
  const { path: filePath, github_token } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: "Missing file path" });
  }

  if (!parcleDb.metadata) {
    parcleDb.metadata = {};
  }
  const context = parcleDb.metadata["orchestrator:active_repo_context"] || {
    active_repo: "custom-docs",
    active_branch: "main",
    last_indexed_file: "README.md"
  };
  const owner = getGitOwner();
  const repo = context.active_repo;
  const branch = context.active_branch || "main";

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  
  try {
    const headers: Record<string, string> = {
      "User-Agent": "CodeLore-App",
      "Accept": "application/vnd.github.v3+json"
    };
    if (github_token) {
      headers["Authorization"] = `token ${github_token}`;
    } else if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const ghRes = await fetch(url, { headers });
    if (!ghRes.ok) {
      const errorText = await ghRes.text();
      return res.status(ghRes.status).json({ error: `GitHub fetch failed: ${ghRes.statusText}. Details: ${errorText}` });
    }

    const data = await ghRes.json();
    if (data.type !== "file" || !data.content) {
      return res.status(400).json({ error: "Target path is not a file or has no content" });
    }

    const rawContent = Buffer.from(data.content, data.encoding || 'base64').toString('utf8');

    // Parse file content: split by H2/H3 headers
    const lines = rawContent.split(/\r?\n/);
    let currentHeader = "Introduction";
    let currentBodyLines: string[] = [];
    const rawChunks: Array<{ header: string; body: string }> = [];

    const finalizeChunk = () => {
      const body = currentBodyLines.join("\n").trim();
      if (body) {
        rawChunks.push({ header: currentHeader, body });
      }
      currentBodyLines = [];
    };

    for (const line of lines) {
      const headerMatch = line.match(/^(###?)\s+(.+)$/);
      if (headerMatch) {
        finalizeChunk();
        currentHeader = headerMatch[2].trim();
      } else {
        currentBodyLines.push(line);
      }
    }
    finalizeChunk();

    // Chunk body to max 400 tokens (approximated by words)
    const finalChunks: Array<{ filename: string; header: string; body: string; source_url: string; timestamp: string; branch: string }> = [];
    const source_url = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
    const timestamp = new Date().toISOString();

    for (const chunk of rawChunks) {
      const words = chunk.body.split(/\s+/).filter(Boolean);
      if (words.length > 400) {
        const paragraphs = chunk.body.split(/\n\n+/);
        let tempParagraphs: string[] = [];
        let tempWordsCount = 0;
        let subIndex = 1;

        for (const para of paragraphs) {
          const paraWords = para.split(/\s+/).filter(Boolean).length;
          if (tempWordsCount + paraWords > 400) {
            if (tempParagraphs.length > 0) {
              finalChunks.push({
                filename: filePath,
                header: chunk.header + ` (Part ${subIndex})`,
                body: tempParagraphs.join("\n\n"),
                source_url,
                timestamp,
                branch
              });
              subIndex++;
            }
            tempParagraphs = [para];
            tempWordsCount = paraWords;
          } else {
            tempParagraphs.push(para);
            tempWordsCount += paraWords;
          }
        }
        if (tempParagraphs.length > 0) {
          finalChunks.push({
            filename: filePath,
            header: chunk.header + (subIndex > 1 ? ` (Part ${subIndex})` : ""),
            body: tempParagraphs.join("\n\n"),
            source_url,
            timestamp,
            branch
          });
        }
      } else {
        finalChunks.push({
          filename: filePath,
          header: chunk.header,
          body: chunk.body,
          source_url,
          timestamp,
          branch
        });
      }
    }

    // Slugify helper
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    };

    // Embed and store
    for (const chunk of finalChunks) {
      const headerSlug = slugify(chunk.header);
      const key = `kb:${repo}:${filePath}:${headerSlug}`;
      const embedding = await generateEmbeddingVec(`${chunk.header}\n${chunk.body}`);
      
      const newValue = {
        text: chunk.body,
        header: chunk.header,
        filename: chunk.filename,
        embedding,
        source_url: chunk.source_url,
        indexed_at: timestamp
      };

      if (parcleDb.metadata[key]) {
        parcleDb.metadata[`${key}:prev`] = parcleDb.metadata[key];
      }
      parcleDb.metadata[key] = newValue;
    }

    // Append manifest
    const manifestKey = "kb:index:manifest";
    const manifestData = parcleDb.metadata[manifestKey];
    let manifest: any[] = [];
    if (Array.isArray(manifestData)) {
      manifest = manifestData;
    } else if (manifestData && typeof manifestData === "object" && Array.isArray(manifestData.files)) {
      manifest = manifestData.files;
    }
    
    manifest = manifest.filter((entry: any) => entry.filename !== filePath);
    manifest.push({
      filename: filePath,
      chunk_count: finalChunks.length,
      indexed_at: timestamp
    });
    
    const totalChunks = manifest.reduce((acc: number, entry: any) => acc + (entry.chunk_count || 0), 0);
    
    parcleDb.metadata[manifestKey] = {
      repo_name: repo,
      chunk_count: totalChunks,
      files: manifest
    };

    context.last_indexed_file = filePath;
    parcleDb.metadata["orchestrator:active_repo_context"] = context;

    await saveParcle();

    return res.json({
      status: "success",
      filename: filePath,
      chunk_count: finalChunks.length,
      indexed_at: timestamp
    });

  } catch (err: any) {
    console.error("Ingestion endpoint failed", err);
    return res.status(500).json({ error: err.message });
  }
});

// Streaming Q&A retrieval (Parcle -> Answer)
app.post("/api/kb/query", async (req, res) => {
  const { query, session_id } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const repoContext = parcleDb.metadata?.["orchestrator:active_repo_context"] || {};
  const repo_name = repoContext.active_repo || "custom-docs";

  let chunk_count = 0;
  let top_3_filenames_from_manifest = "";
  const manifest = parcleDb.metadata?.["kb:index:manifest"] || [];
  const manifestFiles = Array.isArray(manifest) ? manifest : (manifest.files || []);
  chunk_count = manifestFiles.reduce((acc: number, entry: any) => acc + (entry.chunk_count || 0), 0);
  top_3_filenames_from_manifest = manifestFiles.slice(0, 3).map((e: any) => e.filename).join(", ");
  if (!top_3_filenames_from_manifest) {
    top_3_filenames_from_manifest = "README.md, agents.md, parcle_memory_api.md";
  }

  // --- INTENT CLASSIFIER ---
  const normalizedQuery = query.trim().toLowerCase();
  
  const greetings = ["hi", "hello", "hey", "sup", "yo", "hii", "heyy", "good morning", "good evening", "what's up", "howdy"];
  const gratitude = ["thanks", "thank you", "thx", "ty", "great", "perfect", "awesome", "got it"];
  const identity = ["who are you", "what are you", "what can you do", "what do you know", "your capabilities"];

  const appendHistory = async (role: string, content: string, chunks_used?: any[]) => {
    if (!session_id) return;
    const historyKey = `kb:chat:history:${session_id}`;
    if (!parcleDb.metadata) parcleDb.metadata = {};
    const history = parcleDb.metadata[historyKey] || [];
    history.push({ role, content, timestamp: new Date().toISOString(), chunks_used });
    parcleDb.metadata[historyKey] = history;
    await saveParcle();
  };

  const streamImmediateResponse = async (text: string) => {
    await appendHistory("user", query);
    await appendHistory("assistant", text);
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      const token = words[i] + (i === words.length - 1 ? "" : " ");
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  };

  if (greetings.includes(normalizedQuery)) {
    return streamImmediateResponse(`Hey! How can I help you with ${repo_name} today? You can ask me about ${top_3_filenames_from_manifest}.`);
  }

  if (gratitude.includes(normalizedQuery)) {
    return streamImmediateResponse(`Glad that helped! Anything else about the codebase?`);
  }

  if (identity.includes(normalizedQuery)) {
    return streamImmediateResponse(`I'm CodeLore's RAG specialist. I have ${chunk_count} indexed chunks from ${repo_name} in Parcle memory. Ask me about any file, function, or flow in the repo.`);
  }

  try {
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbeddingVec(query);
    } catch (e) {
      console.error("Failed to generate query embedding", e);
    }

    const kbChunks: Array<{ key: string; text: string; header: string; filename: string; embedding: number[]; source_url: string }> = [];
    if (parcleDb.metadata) {
      for (const [key, val] of Object.entries(parcleDb.metadata)) {
        if (key.startsWith("kb:") && key !== "kb:index:manifest" && !key.endsWith(":prev")) {
          const chunkVal = val as any;
          if (chunkVal && chunkVal.text) {
            kbChunks.push({
              key,
              text: chunkVal.text,
              header: chunkVal.header || "",
              filename: chunkVal.filename || "",
              embedding: chunkVal.embedding || [],
              source_url: chunkVal.source_url || ""
            });
          }
        }
      }
    }

    if (kbChunks.length === 0) {
      let suggested = "README.md";
      if (manifestFiles.length > 0) {
        suggested = manifestFiles[0].filename;
      }
      const emptyMsg = JSON.stringify({
        error: "no_results",
        message: `I don't have that in my knowledge base yet. Try adding ${suggested} to get that answer.`,
        suggested_filename: suggested
      });
      res.write(`data: ${emptyMsg}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    const scoredChunks = kbChunks.map(chunk => {
      let score = 0;
      if (queryEmbedding.length > 0 && chunk.embedding && chunk.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding);
      } else {
        score = computeTokenOverlap(query, `${chunk.header} ${chunk.text}`);
      }
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 3).filter(x => x.score > 0.01);

    if (topChunks.length === 0) {
      let suggested = "README.md";
      if (manifestFiles.length > 0) {
        suggested = manifestFiles[0].filename;
      }
      const emptyMsg = JSON.stringify({
        error: "no_results",
        message: `I don't have that in my knowledge base yet. Try adding ${suggested} to get that answer.`,
        suggested_filename: suggested
      });
      res.write(`data: ${emptyMsg}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    const sources = topChunks.map(x => ({
      filename: x.chunk.filename,
      section: x.chunk.header,
      source_url: x.chunk.source_url,
      relevance: Number(x.score.toFixed(2))
    }));
    res.write(`data: ${JSON.stringify({ sources })}\n\n`);

    let contextStr = "";
    let tokenCount = 0;
    for (const scored of topChunks) {
      const chunkText = `[Source: ${scored.chunk.filename} › ${scored.chunk.header}]\n${scored.chunk.text}\n\n`;
      const chunkTokens = chunkText.split(/\s+/).filter(Boolean).length;
      if (tokenCount + chunkTokens <= 900) {
        contextStr += chunkText;
        tokenCount += chunkTokens;
      } else {
        break;
      }
    }

    // Fetch conversation history
    let last3Turns: any[] = [];
    if (session_id) {
      const historyKey = `kb:chat:history:${session_id}`;
      const history = parcleDb.metadata?.[historyKey] || [];
      last3Turns = history.slice(-3);
    }

    const ai = getAI();
    let suggested_file = "README.md";
    if (manifestFiles.length > 0) {
      const matched = manifestFiles.find((f: any) => query.toLowerCase().includes(f.filename.toLowerCase()));
      suggested_file = matched ? matched.filename : manifestFiles[0].filename;
    }

    await appendHistory("user", query);

    let finalAnswer = "";
    if (!ai) {
      const filename = topChunks[0].chunk.filename;
      const header = topChunks[0].chunk.header;
      finalAnswer = `Based on the provided chunk ${filename}, here is the information: CodeLore uses Parcle memory systems to index workspace documentation. We can query these memories semantic RAG search easily.\n\n› Source: ${filename} ${header}`;
      
      const words = finalAnswer.split(" ");
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ token: word + " " })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      await appendHistory("assistant", finalAnswer, sources);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    const systemPrompt = `You are CodeLore, an intelligent codebase assistant for the repo ${repo_name}. Answer using ONLY the context chunks provided. Be concise (2-3 sentences). If the answer isn't in context, say exactly:
'I don't have that in my knowledge base yet. Try adding ${suggested_file} to get that answer.'
Never say 'No matching knowledge found.' — always suggest a next action instead.
End answers with: › Source: {filename} {header}`;

    let userPromptContent = "";
    if (last3Turns.length > 0) {
      userPromptContent += "Last 3 turns of conversation history:\n";
      for (const turn of last3Turns) {
        userPromptContent += `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}\n`;
      }
      userPromptContent += "\n";
    }
    userPromptContent += `Context chunks:\n${contextStr}\n\nQuestion: ${query}`;

    const streamPromise = ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: userPromptContent,
      config: {
        systemInstruction: systemPrompt
      }
    });

    let completed = false;
    const timeoutId = setTimeout(() => {
      if (!completed) {
        res.write(`data: ${JSON.stringify({ token: " [Answer truncated — ask for more detail]" })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        completed = true;
      }
    }, 5000);

    try {
      const responseStream = await streamPromise;
      for await (const chunk of responseStream) {
        if (completed) break;
        const text = chunk.text;
        if (text) {
          finalAnswer += text;
          res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
        }
      }
      if (!completed) {
        clearTimeout(timeoutId);
        await appendHistory("assistant", finalAnswer, sources);
        res.write(`data: [DONE]\n\n`);
        res.end();
        completed = true;
      }
    } catch (streamErr: any) {
      console.error("Stream failed", streamErr);
      if (!completed) {
        clearTimeout(timeoutId);
        res.write(`data: ${JSON.stringify({ token: `\n[Stream Error: ${streamErr.message}]` })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    }

  } catch (err: any) {
    console.error("Query stream endpoint failed", err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
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

  if (!parcleDb.metadata) {
    parcleDb.metadata = {};
  }
  if (!parcleDb.metadata["orchestrator:active_repo_context"]) {
    parcleDb.metadata["orchestrator:active_repo_context"] = {
      active_repo: "custom-docs",
      active_branch: "main",
      last_indexed_file: "README.md"
    };
  }
  parcleDb.metadata["orchestrator:active_repo_context"].last_indexed_file = filename;

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
      model: "gemini-2.0-flash",
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

function getGitOwner(): string {
  let remoteUrl = "";
  try {
    remoteUrl = execSync("git config --get remote.origin.url", { cwd: process.cwd() }).toString().trim();
  } catch (e) {}
  
  if (remoteUrl) {
    const match = remoteUrl.match(/(?:github\.com[:/])([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return "svimaladevi9503";
}

app.get("/api/orchestrate/context", (req, res) => {
  if (!parcleDb.metadata) {
    parcleDb.metadata = {};
  }
  if (!parcleDb.metadata["orchestrator:active_repo_context"]) {
    parcleDb.metadata["orchestrator:active_repo_context"] = {
      active_repo: "custom-docs",
      active_branch: "main",
      last_indexed_file: "README.md"
    };
  }
  res.json({
    status: "success",
    context: {
      ...parcleDb.metadata["orchestrator:active_repo_context"],
      owner: getGitOwner()
    }
  });
});

app.post("/api/orchestrate/context", async (req, res) => {
  if (!parcleDb.metadata) {
    parcleDb.metadata = {};
  }
  if (!parcleDb.metadata["orchestrator:active_repo_context"]) {
    parcleDb.metadata["orchestrator:active_repo_context"] = {
      active_repo: "custom-docs",
      active_branch: "main",
      last_indexed_file: "README.md"
    };
  }
  
  const { active_repo, active_branch, last_indexed_file } = req.body;
  const current = parcleDb.metadata["orchestrator:active_repo_context"];
  
  const updated = {
    active_repo: active_repo !== undefined ? active_repo : current.active_repo,
    active_branch: active_branch !== undefined ? active_branch : current.active_branch,
    last_indexed_file: last_indexed_file !== undefined ? last_indexed_file : current.last_indexed_file
  };
  
  parcleDb.metadata["orchestrator:active_repo_context"] = updated;
  await saveParcle();
  
  res.json({
    status: "success",
    context: {
      ...updated,
      owner: getGitOwner()
    }
  });
});

app.get("/api/github/login", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send("GITHUB_CLIENT_ID is not configured in the environment.");
  }
  const host = req.get("host") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.startsWith("0.0.0.0");
  const protocol = isLocal ? "http" : "https";
  const appUrl = process.env.APP_URL || `${protocol}://${host}`;
  const redirectUri = `${appUrl}/api/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo%20user`;
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
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>GitHub Authentication Success</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: radial-gradient(circle at center, #0e1726 0%, #050b14 100%);
              color: #f8fafc;
              font-family: 'Plus Jakarta Sans', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              overflow: hidden;
            }
            .container {
              position: relative;
              width: 100%;
              max-width: 420px;
              padding: 40px 32px;
              border-radius: 24px;
              background: rgba(13, 21, 39, 0.45);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
              text-align: center;
              animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .icon-wrapper {
              position: relative;
              display: inline-flex;
              justify-content: center;
              align-items: center;
              width: 80px;
              height: 80px;
              margin-bottom: 24px;
            }
            .glow-ring {
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              border: 2px solid rgba(16, 185, 129, 0.2);
              animation: pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }
            @keyframes pulseRing {
              0% {
                transform: scale(0.95);
                opacity: 1;
              }
              50% {
                transform: scale(1.15);
                opacity: 0.5;
              }
              100% {
                transform: scale(1.3);
                opacity: 0;
              }
            }
            .icon-circle {
              width: 72px;
              height: 72px;
              border-radius: 50%;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
            }
            .icon-circle svg {
              width: 36px;
              height: 36px;
              color: white;
              stroke-dasharray: 50;
              stroke-dashoffset: 50;
              animation: drawCheck 0.6s 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            @keyframes drawCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
            h1 {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 12px;
              letter-spacing: -0.02em;
              background: linear-gradient(120deg, #ffffff 0%, #cbd5e1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            p {
              font-size: 14px;
              color: #94a3b8;
              line-height: 1.6;
              margin-bottom: 32px;
            }
            .progress-bar-container {
              width: 100%;
              height: 4px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 2px;
              overflow: hidden;
              position: relative;
            }
            .progress-bar {
              height: 100%;
              width: 0%;
              background: linear-gradient(90deg, #10b981, #34d399);
              border-radius: 2px;
              animation: fillProgress 2s linear forwards;
            }
            @keyframes fillProgress {
              to {
                width: 100%;
              }
            }
            .redirect-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-top: 12px;
              display: block;
            }
            @media (prefers-color-scheme: light) {
              body {
                background: radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%);
                color: #0f172a;
              }
              .container {
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(0, 0, 0, 0.08);
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5);
              }
              h1 {
                background: linear-gradient(120deg, #0f172a 0%, #334155 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              p {
                color: #475569;
              }
              .progress-bar-container {
                background: rgba(0, 0, 0, 0.05);
              }
              .redirect-label {
                color: #94a3b8;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon-wrapper">
              <div class="glow-ring"></div>
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1>Authentication Successful!</h1>
            <p>GitHub account successfully linked. Returning to CodeLore workspace.</p>
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
            <span class="redirect-label">Redirecting in a moment</span>
          </div>
          <script>
            localStorage.setItem("gh_session", "${accessToken}");
            localStorage.setItem("github_token", "${accessToken}");
            setTimeout(() => {
              window.location.href = "/";
            }, 2000);
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
