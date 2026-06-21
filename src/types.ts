export interface SystemInfo {
  status: string;
  system: {
    cwd: string;
    readme_exists: boolean;
    readme_size: number;
    time: string;
  };
  parcle: {
    db_file: string;
    readmes_count: number;
    prs_count: number;
    v_store_size: number;
    qa_logs_count: number;
    patches_count: number;
    pipeline_runs_count: number;
  };
}

export interface ParcleRecord {
  readmes: Record<string, { content: string; timestamp: string; sha: string; author?: string }>;
  prs: Record<string, { url: string; sha: string; title: string; status: string; timestamp: string }>;
  v_store: Array<{ id: string; filename: string; section: string; content: string }>;
  qa_logs: Array<{ query: string; answer: string; timestamp: string; sources: Array<{ filename: string; section: string; relevance: string }> }>;
  clean_patches: Record<string, { file: string; patch: string; timestamp: string; applied: boolean }>;
  pipeline_runs: Array<{ id: string; name: string; status: string; timestamp: string; log: string }>;
}

export interface ScanIssue {
  file: string;
  line: number;
  issue_type: string;
  suggestion: string;
  patch_snippet: string;
}

export interface WebhookResult {
  sha: string;
  branch: string;
  author: string;
  diff: string;
  oldReadme: string;
  newReadme: string;
  timestamp: string;
}
