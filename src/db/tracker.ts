import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../data/pipeline.db");

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    budget_type TEXT,
    budget_min REAL,
    budget_max REAL,
    hourly_rate_min REAL,
    hourly_rate_max REAL,
    skills TEXT,
    client_country TEXT,
    client_payment_verified INTEGER,
    client_hire_rate REAL,
    client_total_spent REAL,
    posted_at TEXT,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    score INTEGER,
    score_breakdown TEXT,
    status TEXT DEFAULT 'new',
    proposal_generated INTEGER DEFAULT 0,
    proposal_text TEXT,
    proposal_template TEXT,
    submitted_at TEXT,
    response_at TEXT,
    outcome TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    template_used TEXT,
    content TEXT NOT NULL,
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    submitted INTEGER DEFAULT 0,
    submitted_at TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    jobs_fetched INTEGER DEFAULT 0,
    jobs_qualified INTEGER DEFAULT 0,
    proposals_generated INTEGER DEFAULT 0,
    proposals_submitted INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    jobs_won INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score);
  CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at);
`);

export interface Job {
  id: string;
  title: string;
  description?: string;
  url: string;
  budget_type?: string;
  budget_min?: number;
  budget_max?: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  skills?: string;
  client_country?: string;
  client_payment_verified?: boolean;
  client_hire_rate?: number;
  client_total_spent?: number;
  posted_at?: string;
  fetched_at?: string;
  score?: number;
  score_breakdown?: string;
  status: "new" | "qualified" | "proposed" | "submitted" | "responded" | "won" | "lost" | "rejected";
  proposal_generated?: boolean;
  proposal_text?: string;
  proposal_template?: string;
  submitted_at?: string;
  response_at?: string;
  outcome?: string;
  notes?: string;
}

export interface Proposal {
  id: number;
  job_id: string;
  template_used?: string;
  content: string;
  generated_at: string;
  submitted: boolean;
  submitted_at?: string;
}

export function saveJob(job: Partial<Job>): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO jobs (
      id, title, description, url, budget_type, budget_min, budget_max,
      hourly_rate_min, hourly_rate_max, skills, client_country,
      client_payment_verified, client_hire_rate, client_total_spent,
      posted_at, score, score_breakdown, status, proposal_generated,
      proposal_text, proposal_template
    ) VALUES (
      @id, @title, @description, @url, @budget_type, @budget_min, @budget_max,
      @hourly_rate_min, @hourly_rate_max, @skills, @client_country,
      @client_payment_verified, @client_hire_rate, @client_total_spent,
      @posted_at, @score, @score_breakdown, @status, @proposal_generated,
      @proposal_text, @proposal_template
    )
  `);

  stmt.run({
    id: job.id,
    title: job.title,
    description: job.description || null,
    url: job.url,
    budget_type: job.budget_type || null,
    budget_min: job.budget_min || null,
    budget_max: job.budget_max || null,
    hourly_rate_min: job.hourly_rate_min || null,
    hourly_rate_max: job.hourly_rate_max || null,
    skills: job.skills || null,
    client_country: job.client_country || null,
    client_payment_verified: job.client_payment_verified ? 1 : 0,
    client_hire_rate: job.client_hire_rate || null,
    client_total_spent: job.client_total_spent || null,
    posted_at: job.posted_at || null,
    score: job.score || null,
    score_breakdown: job.score_breakdown || null,
    status: job.status || "new",
    proposal_generated: job.proposal_generated ? 1 : 0,
    proposal_text: job.proposal_text || null,
    proposal_template: job.proposal_template || null,
  });
}

export function getJob(id: string): Job | undefined {
  const stmt = db.prepare("SELECT * FROM jobs WHERE id = ?");
  const row = stmt.get(id) as any;
  if (!row) return undefined;
  return {
    ...row,
    client_payment_verified: Boolean(row.client_payment_verified),
    proposal_generated: Boolean(row.proposal_generated),
  };
}

export function getJobsByStatus(status: string): Job[] {
  const stmt = db.prepare("SELECT * FROM jobs WHERE status = ? ORDER BY score DESC");
  return (stmt.all(status) as any[]).map((row) => ({
    ...row,
    client_payment_verified: Boolean(row.client_payment_verified),
    proposal_generated: Boolean(row.proposal_generated),
  }));
}

export function getQualifiedJobs(minScore: number = 50): Job[] {
  const stmt = db.prepare("SELECT * FROM jobs WHERE score >= ? AND status IN ('new', 'qualified') ORDER BY score DESC");
  return (stmt.all(minScore) as any[]).map((row) => ({
    ...row,
    client_payment_verified: Boolean(row.client_payment_verified),
    proposal_generated: Boolean(row.proposal_generated),
  }));
}

export function getJobsNeedingProposals(minScore: number = 75): Job[] {
  const stmt = db.prepare(`
    SELECT * FROM jobs
    WHERE score >= ?
    AND proposal_generated = 0
    AND status IN ('new', 'qualified')
    ORDER BY score DESC
  `);
  return (stmt.all(minScore) as any[]).map((row) => ({
    ...row,
    client_payment_verified: Boolean(row.client_payment_verified),
    proposal_generated: Boolean(row.proposal_generated),
  }));
}

export function updateJobStatus(id: string, status: string, notes?: string): void {
  const stmt = db.prepare("UPDATE jobs SET status = ?, notes = COALESCE(?, notes) WHERE id = ?");
  stmt.run(status, notes || null, id);
}

export function saveProposal(jobId: string, content: string, template?: string): number {
  const stmt = db.prepare(`
    INSERT INTO proposals (job_id, template_used, content)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(jobId, template || null, content);

  // Update job
  const updateStmt = db.prepare(`
    UPDATE jobs SET
      proposal_generated = 1,
      proposal_text = ?,
      proposal_template = ?,
      status = CASE WHEN status = 'new' THEN 'qualified' ELSE status END
    WHERE id = ?
  `);
  updateStmt.run(content, template || null, jobId);

  return result.lastInsertRowid as number;
}

export function markProposalSubmitted(jobId: string): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE proposals SET submitted = 1, submitted_at = ? WHERE job_id = ?
  `);
  stmt.run(now, jobId);

  const jobStmt = db.prepare(`
    UPDATE jobs SET status = 'submitted', submitted_at = ? WHERE id = ?
  `);
  jobStmt.run(now, jobId);
}

export function recordResponse(jobId: string, outcome: "responded" | "won" | "lost", notes?: string): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE jobs SET
      status = ?,
      response_at = ?,
      outcome = ?,
      notes = COALESCE(?, notes)
    WHERE id = ?
  `);
  stmt.run(outcome, now, outcome, notes || null, jobId);
}

export function getStats(days: number = 30): any {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_jobs,
      COUNT(CASE WHEN score >= 50 THEN 1 END) as qualified_jobs,
      COUNT(CASE WHEN proposal_generated = 1 THEN 1 END) as proposals_generated,
      COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
      COUNT(CASE WHEN status = 'responded' THEN 1 END) as responses,
      COUNT(CASE WHEN status = 'won' THEN 1 END) as won,
      COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
      AVG(score) as avg_score
    FROM jobs
    WHERE fetched_at >= datetime('now', '-' || ? || ' days')
  `);
  return stmt.get(days);
}

export function getAllJobs(limit: number = 100): Job[] {
  const stmt = db.prepare("SELECT * FROM jobs ORDER BY fetched_at DESC LIMIT ?");
  return (stmt.all(limit) as any[]).map((row) => ({
    ...row,
    client_payment_verified: Boolean(row.client_payment_verified),
    proposal_generated: Boolean(row.proposal_generated),
  }));
}

export function jobExists(id: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM jobs WHERE id = ?");
  return stmt.get(id) !== undefined;
}

export { db };
