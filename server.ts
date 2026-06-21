import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Parcle In-Memory Database with backups to disk
const PARCLE_FILE_PATH = path.join(process.cwd(), "parcle_memory_db.json");
let parcleDb: {
  readmes: Record<string, { content: string; timestamp: string; sha: string; author?: string }>;
  prs: Record<string, { url: string; sha: string; title: string; status: string; timestamp: string }>;
  v_store: Array<{ id: string; filename: string; section: string; content: string; embedding?: number[] }>;
  qa_logs: Array<{ query: string; answer: string; timestamp: string; sources: any[] }>;
  clean_patches: Record<string, { file: string; patch: string; timestamp: string; applied: boolean }>;
  pipeline_runs: Array<{ id: string; name: string; status: string; timestamp: string; log: string }>;
} = {
  readmes: {},
  prs: {},
  v_store: [],
  qa_logs: [],
  clean_patches: {},
  pipeline_runs: []
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

function loadParcle() {
  try {
    if (fs.existsSync(PARCLE_FILE_PATH)) {
      const data = fs.readFileSync(PARCLE_FILE_PATH, 'utf-8');
      parcleDb = JSON.parse(data);
    } else {
      parcleDb.v_store = [...DEFAULT_DOCS];
      saveParcle();
    }
  } catch (err) {
    console.error("Failed to load Parcle, falling back to clean memory.", err);
    parcleDb.v_store = [...DEFAULT_DOCS];
  }
}

function saveParcle(): boolean {
  try {
    fs.writeFileSync(PARCLE_FILE_PATH, JSON.stringify(parcleDb, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Local Parcle write fallback failed", err);
    return false;
  }
}

// Load Parcle at startup
loadParcle();

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
      pipeline_runs_count: parcleDb.pipeline_runs.length
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

// Run simulated pipeline test
app.post("/api/pipeline/run", (req, res) => {
  const { name = "Automated Standard Check" } = req.body;
  const id = "pipeline_" + Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toISOString();
  
  // Create simulated testing log
  const status = Math.random() > 0.05 ? "passed" : "failed";
  const log = `[${timestamp}] Booting virtual testing framework...\n[${timestamp}] Running AST verification on ./src/\n[${timestamp}] Validating export modules\n[${timestamp}] Test suite compilation completes. Status: ${status.toUpperCase()}`;

  parcleDb.pipeline_runs.unshift({ id, name, status, timestamp, log });
  saveParcle();

  res.json({
    id,
    name,
    status,
    timestamp,
    log
  });
});

// Dynamic Code Cleaner AST Static Scan
app.post("/api/clean/scan", (req, res) => {
  let { code, filename = "App.tsx", scanWholeWorkspace = false } = req.body;

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

    // Verify imported symbols usage
    for (const imp of importedSymbols) {
      const regex = new RegExp(`\\b${imp.name}\\b`, 'g');
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
    applied: false
  };
  saveParcle();

  res.json({
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
  });
});

// Apply suggested patches from Cleaner Agent
app.post("/api/clean/apply", (req, res) => {
  const { patchId } = req.body;
  if (!parcleDb.clean_patches[patchId]) {
    return res.status(404).json({ error: "Patch not found", status: "failed" });
  }

  parcleDb.clean_patches[patchId].applied = true;
  saveParcle();

  res.json({
    agent: "CLEANER AGENT",
    status: "success",
    result: {
      status: "applied",
      msg: "Simulated patch applied successfully. System AST status updated."
    },
    parcle_write: "success"
  });
});

// -----------------------------------------------------------------------------
// WEBHOOK & DOCUMENTATION HELPER ROUTING WITH POPUP APPROVAL
// -----------------------------------------------------------------------------

// Triggers push command simulation
app.post("/api/webhook", async (req, res) => {
  const { commitHistory, repoName = "Repository", author = "quack-author", branch = "main" } = req.body;
  const sha = Math.random().toString(36).substring(2, 10) + "df";
  const timestamp = new Date().toISOString();

  // Create artificial code commit summary or extraction
  const diffStr = commitHistory || `diff --git a/src/App.tsx b/src/App.tsx\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -2,1 +2,2 @@\n-  return <div>Hello</div>;\n+  // Integrated automated tracking\n+  return <div>Hello Realtime Tracked Web app</div>;`;

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

  // Return to frontend for "Accept & Update" popup confirmation before modifying
  res.json({
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
  });
});

// Callback when user hits "Accept & Update" in frontend popup
app.post("/api/approve-readme", (req, res) => {
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

  // Generate GitHub simulated PR
  const prId = `pr_${sha}`;
  const prUrl = `https://github.com/Parcle-AI/automations/pull/${Math.floor(Math.random() * 900) + 100}`;
  
  parcleDb.prs[prId] = {
    url: prUrl,
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

  saveParcle();

  res.json({
    agent: "DOCUMENTATION HELPER",
    status: "success",
    result: {
      pr_url: prUrl,
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

app.post("/api/rag/query", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const chunks = parcleDb.v_store;
  if (chunks.length === 0) {
    return res.json({
      agent: "KNOWLEDGE BASE AGENT",
      status: "failed",
      result: {
        answer: "No documentation found. Has the Documentation Helper run yet?",
        sources: []
      },
      parcle_write: "skipped"
    });
  }

  // Evaluate overlap scores for RAG retrieval
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
      // Offline smart fallback text builder
      finalAnswer = `Based on the Parcle vector chunks, I found relevant matches in **${topK[0].chunk.filename}** under the section **"${topK[0].chunk.section}"**. Here is the context:\n\n${topK[0].chunk.content}`;
    }
  }

  const timestamp = new Date().toISOString();
  parcleDb.qa_logs.unshift({
    query,
    answer: finalAnswer,
    timestamp,
    sources: topK.map(item => ({ filename: item.chunk.filename, section: item.chunk.section, relevance: item.score.toFixed(2) }))
  });
  saveParcle();

  res.json({
    agent: "KNOWLEDGE BASE AGENT",
    status: "success",
    result: {
      answer: finalAnswer,
      sources: topK.map(item => ({ filename: item.chunk.filename, section: item.chunk.section, relevance: item.score }))
    },
    parcle_write: "success",
    timestamp
  });
});

// Custom Vector chunk addition
app.post("/api/rag/add-chunk", (req, res) => {
  const { filename, section, content } = req.body;
  if (!filename || !section || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const id = `chunk_custom_${Date.now()}`;
  parcleDb.v_store.push({ id, filename, section, content });
  saveParcle();

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

  // Fast Routing check
  if (event_type === "push") {
    // Route to documentation helper automatically
    return res.redirect(307, "/api/webhook");
  } else if (event_type === "chat_query") {
    // Route to Knowledge base
    return res.redirect(307, "/api/rag/query");
  } else if (event_type === "scan") {
    // Route to static cleaner
    return res.redirect(307, "/api/clean/scan");
  } else {
    // Unknown or ambiguous event: Invoke dynamic routing module
    const classification = await classifyIntentWithLLM(payload);
    
    if (classification.confidence < 0.7) {
      return res.json({
        agent: "ORCHESTRATOR",
        status: "partial",
        result: {
          classification,
          requires_clarification: true,
          clarification_message: `The Orchestrator mapped this request to '${classification.route}' with confidence ${classification.confidence.toFixed(2)}. This is below our 0.7 limit. Please clarify your specific intent.`
        },
        parcle_write: "skipped",
        error: "low_confidence_route",
        timestamp: new Date().toISOString()
      });
    }

    // Direct routing based on LLM output
    if (classification.route === "DOCUMENTATION HELPER") {
      return res.redirect(307, "/api/webhook");
    } else if (classification.route === "CLEANER AGENT") {
      return res.redirect(307, "/api/clean/scan");
    } else {
      return res.redirect(307, "/api/rag/query");
    }
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
