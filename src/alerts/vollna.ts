import "dotenv/config";
import { saveJob, jobExists, type Job } from "../db/tracker.js";
import { scoreJob } from "../ai/scorer.js";

const API_BASE = "https://api.vollna.com/v1";

interface VollnaFilter {
  id: number;
  name: string;
}

interface VollnaProject {
  uid?: string;
  ciphertext?: string;
  url: string;
  title: string;
  description: string;
  skills?: string[] | string;
  budget_type?: string;
  budget?: string | { min?: number; max?: number; amount?: number };
  hourly_rate?: string | { min?: number; max?: number; amount?: number };
  site?: string;
  published?: string;
  client?: {
    country?: string;
    payment_verified?: boolean;
    rating?: number;
    reviews_count?: number;
    total_spent?: number;
    hire_rate?: number;
  };
}

interface ApiResponse<T> {
  data: T;
  pagination?: {
    total: number;
    limit: number;
    done: boolean;
    next_cursor?: string;
  };
}

async function apiRequest<T>(endpoint: string): Promise<T | null> {
  const token = process.env.VOLLNA_API_TOKEN;

  if (!token) {
    console.error("VOLLNA_API_TOKEN not set in environment");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "X-API-TOKEN": token,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vollna API error ${response.status}: ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Vollna API request failed:", error);
    return null;
  }
}

export async function listFilters(): Promise<VollnaFilter[]> {
  const response = await apiRequest<ApiResponse<VollnaFilter[]>>("/filters");
  if (!response?.data) {
    console.log("No filters found or API error");
    return [];
  }
  console.log(`Found ${response.data.length} filters`);
  return response.data;
}

export async function getProjectsForFilter(filterId: number): Promise<VollnaProject[]> {
  const response = await apiRequest<ApiResponse<VollnaProject[]>>(`/filters/${filterId}/projects?limit=50`);
  if (!response?.data) {
    return [];
  }
  return response.data;
}

function extractJobId(project: VollnaProject): string {
  // Use ciphertext (Upwork job ID) or UID or extract from URL
  if (project.ciphertext) {
    return project.ciphertext.replace("~", "");
  }
  if (project.uid) {
    return project.uid;
  }
  // Extract from URL: https://www.upwork.com/jobs/~JOBID
  const match = project.url?.match(/~(\w+)/);
  return match ? match[1] : project.url || Date.now().toString();
}

function parseBudget(project: VollnaProject): { type: string; min?: number; max?: number } | null {
  const budget = project.budget;
  if (!budget) return null;

  // Handle if budget is already an object
  if (typeof budget === "object") {
    const b = budget as any;
    if (b.min || b.max || b.amount) {
      return {
        type: "fixed",
        min: b.min || b.amount || 0,
        max: b.max || b.amount || b.min || 0
      };
    }
    return null;
  }

  // Handle string budget: "$500" or "$500 - $1,000" or "$2,000-$3,000"
  const budgetStr = String(budget);
  const fixedMatch = budgetStr.match(/\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?/);
  if (fixedMatch) {
    const min = parseInt(fixedMatch[1].replace(/,/g, ""));
    const max = fixedMatch[2] ? parseInt(fixedMatch[2].replace(/,/g, "")) : min;
    return { type: "fixed", min, max };
  }

  return null;
}

function parseHourlyRate(project: VollnaProject): { min?: number; max?: number } | null {
  const rate = project.hourly_rate || project.budget;
  if (!rate) return null;

  // Handle if rate is already an object
  if (typeof rate === "object") {
    const r = rate as any;
    if (r.min || r.max || r.amount) {
      return {
        min: r.min || r.amount || 0,
        max: r.max || r.amount || r.min || 0
      };
    }
    return null;
  }

  const rateStr = String(rate);

  // Hourly: "$30 - $50/hr" or "$30/hr" or "$30-$50"
  if (project.budget_type === "hourly" || rateStr.toLowerCase().includes("hour")) {
    const match = rateStr.match(/\$?([\d.]+)(?:\s*-\s*\$?([\d.]+))?/);
    if (match) {
      const min = parseFloat(match[1]);
      const max = match[2] ? parseFloat(match[2]) : min;
      return { min, max };
    }
  }

  return null;
}

function parseSkills(skills?: string[] | string): string | undefined {
  if (!skills) return undefined;
  if (Array.isArray(skills)) {
    return skills.join(", ");
  }
  return skills;
}

export async function fetchVollnaJobs(): Promise<VollnaProject[]> {
  const filters = await listFilters();

  if (filters.length === 0) {
    console.log("No filters configured in Vollna. Please create filters first.");
    return [];
  }

  const allProjects: VollnaProject[] = [];

  for (const filter of filters) {
    console.log(`Fetching projects for filter: ${filter.name} (ID: ${filter.id})`);
    const projects = await getProjectsForFilter(filter.id);
    console.log(`  Found ${projects.length} projects`);
    allProjects.push(...projects);

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueProjects = allProjects.filter(p => {
    const key = p.url || p.ciphertext || p.uid;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Total unique projects: ${uniqueProjects.length}`);
  return uniqueProjects;
}

export async function processVollnaJobs(): Promise<{
  total: number;
  new: number;
  qualified: number;
  jobs: Job[];
}> {
  const projects = await fetchVollnaJobs();
  const results = {
    total: projects.length,
    new: 0,
    qualified: 0,
    jobs: [] as Job[],
  };

  for (const project of projects) {
    const jobId = extractJobId(project);

    // Skip if already in database
    if (jobExists(jobId)) {
      continue;
    }

    results.new++;

    const budget = parseBudget(project);
    const hourlyRate = parseHourlyRate(project);
    const skills = parseSkills(project.skills);

    const job: Partial<Job> = {
      id: jobId,
      title: project.title,
      description: project.description,
      url: project.url,
      posted_at: project.published,
      skills: skills,
      status: "new",
    };

    // Client info
    if (project.client) {
      job.client_country = project.client.country;
      job.client_payment_verified = project.client.payment_verified;
      job.client_hire_rate = project.client.hire_rate;
      job.client_total_spent = project.client.total_spent;
    }

    // Budget info
    if (project.budget_type === "hourly" || hourlyRate) {
      job.budget_type = "hourly";
      if (hourlyRate) {
        job.hourly_rate_min = hourlyRate.min;
        job.hourly_rate_max = hourlyRate.max;
      }
    } else if (budget) {
      job.budget_type = budget.type;
      job.budget_min = budget.min;
      job.budget_max = budget.max;
    }

    // Score the job
    const scoreResult = scoreJob(job);
    job.score = scoreResult.total;
    job.score_breakdown = JSON.stringify(scoreResult.breakdown);

    if (scoreResult.total >= 50) {
      job.status = "qualified";
      results.qualified++;
    }

    saveJob(job);
    results.jobs.push(job as Job);
  }

  console.log(`Processed: ${results.total} total, ${results.new} new, ${results.qualified} qualified`);
  return results;
}

// CLI execution
const args = process.argv.slice(2);
if (args.includes("--test") || args.includes("test")) {
  console.log("Testing Vollna API connection...\n");

  listFilters().then(filters => {
    if (filters.length > 0) {
      console.log("\nFilters found:");
      filters.forEach(f => console.log(`  - ${f.name} (ID: ${f.id})`));
    }
  });
}

if (args.includes("--fetch") || args.includes("fetch")) {
  processVollnaJobs().then(results => {
    console.log("\nResults:", JSON.stringify(results, null, 2));
  });
}
