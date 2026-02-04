import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { Job } from "../db/tracker.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scoringConfig = JSON.parse(
  readFileSync(join(__dirname, "../../config/scoring.json"), "utf-8")
);

export interface ScoreBreakdown {
  budget: number;
  techMatch: number;
  clientQuality: number;
  projectClarity: number;
  timing: number;
  bonuses: number;
  penalties: number;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  autoReject: boolean;
  rejectReason?: string;
}

function scoreBudget(job: Partial<Job>): { score: number; reason: string } {
  const config = scoringConfig.budget;

  if (job.budget_type === "hourly" && job.hourly_rate_min) {
    const rate = job.hourly_rate_min;
    for (const [tier, { min, score }] of Object.entries(config.hourly) as [string, { min: number; score: number }][]) {
      if (rate >= min) {
        return { score, reason: `Hourly rate $${rate}/hr (${tier})` };
      }
    }
  }

  if (job.budget_min) {
    const budget = job.budget_max || job.budget_min;
    for (const [tier, { min, score }] of Object.entries(config.fixed) as [string, { min: number; score: number }][]) {
      if (budget >= min) {
        return { score, reason: `Fixed budget $${budget} (${tier})` };
      }
    }
  }

  return { score: 30, reason: "Budget not specified" };
}

function scoreTechMatch(job: Partial<Job>): { score: number; reason: string } {
  const text = `${job.title || ""} ${job.description || ""} ${job.skills || ""}`.toLowerCase();
  const config = scoringConfig.techKeywords;

  let totalScore = 0;
  const matches: string[] = [];

  // Primary keywords (most valuable)
  for (const keyword of config.primary.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      totalScore = Math.max(totalScore, config.primary.score);
      matches.push(keyword);
    }
  }

  // Secondary keywords
  for (const keyword of config.secondary.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      if (totalScore < config.secondary.score) {
        totalScore = config.secondary.score;
      }
      matches.push(keyword);
    }
  }

  // Bonus keywords (additive)
  for (const keyword of config.bonus.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      totalScore = Math.min(100, totalScore + config.bonus.score / 2);
      matches.push(keyword);
    }
  }

  // Negative keywords
  for (const keyword of config.negative.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      totalScore = Math.max(0, totalScore + config.negative.score);
      matches.push(`-${keyword}`);
    }
  }

  const reason = matches.length > 0 ? `Tech: ${matches.join(", ")}` : "No tech keywords matched";
  return { score: totalScore, reason };
}

function scoreClientQuality(job: Partial<Job>): { score: number; reason: string } {
  const config = scoringConfig.clientSignals;
  let score = 50; // Base score
  const reasons: string[] = [];

  if (job.client_payment_verified) {
    score += config.positive.paymentVerified;
    reasons.push("Payment verified");
  } else {
    score += config.negative.noPaymentMethod;
    reasons.push("No payment method");
  }

  if (job.client_hire_rate !== undefined) {
    if (job.client_hire_rate >= 50) {
      score += config.positive.hireRate50Plus;
      reasons.push(`${job.client_hire_rate}% hire rate`);
    } else if (job.client_hire_rate < 20) {
      score += config.negative.hireRateBelow20;
      reasons.push(`Low hire rate: ${job.client_hire_rate}%`);
    }
  }

  if (job.client_total_spent !== undefined && job.client_total_spent >= 10000) {
    score += config.positive.spent10kPlus;
    reasons.push(`$${job.client_total_spent.toLocaleString()} spent`);
  }

  return { score: Math.max(0, Math.min(100, score)), reason: reasons.join(", ") || "Client data unknown" };
}

function scoreProjectClarity(job: Partial<Job>): { score: number; reason: string } {
  const config = scoringConfig.projectClarity.indicators;
  const description = job.description || "";
  let score = 40; // Base score
  const reasons: string[] = [];

  // Check for detailed description
  if (description.length > 500) {
    score += config.detailedDescription;
    reasons.push("Detailed description");
  } else if (description.length > 200) {
    score += config.detailedDescription / 2;
    reasons.push("Moderate detail");
  }

  // Check for technical specifications
  const techTerms = ["api", "database", "authentication", "integration", "endpoints", "schema", "architecture"];
  if (techTerms.some((term) => description.toLowerCase().includes(term))) {
    score += config.hasTechSpec;
    reasons.push("Has tech specs");
  }

  // Check for examples/references
  if (description.toLowerCase().includes("example") || description.toLowerCase().includes("reference") || description.toLowerCase().includes("similar to")) {
    score += config.hasExamples;
    reasons.push("Has examples");
  }

  // Check for timeline/milestones
  if (description.toLowerCase().includes("milestone") || description.toLowerCase().includes("phase") || description.toLowerCase().includes("deadline")) {
    score += config.hasMilestones;
    reasons.push("Has milestones");
  }

  return { score: Math.min(100, score), reason: reasons.join(", ") || "Basic requirements" };
}

function scoreTiming(job: Partial<Job>): { score: number; reason: string } {
  const config = scoringConfig.timing;

  if (!job.posted_at) {
    return { score: 50, reason: "Unknown posting time" };
  }

  const postedAt = new Date(job.posted_at);
  const now = new Date();
  const hoursSincePosted = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSincePosted <= 1) return { score: config.postedWithin1Hour, reason: "Posted <1 hour ago" };
  if (hoursSincePosted <= 3) return { score: config.postedWithin3Hours, reason: "Posted <3 hours ago" };
  if (hoursSincePosted <= 6) return { score: config.postedWithin6Hours, reason: "Posted <6 hours ago" };
  if (hoursSincePosted <= 12) return { score: config.postedWithin12Hours, reason: "Posted <12 hours ago" };
  if (hoursSincePosted <= 24) return { score: config.postedWithin24Hours, reason: "Posted <24 hours ago" };
  return { score: config.olderThan24Hours, reason: `Posted ${Math.floor(hoursSincePosted)} hours ago` };
}

export function scoreJob(job: Partial<Job>): ScoreResult {
  const weights = scoringConfig.weights;
  const reasons: string[] = [];

  // Calculate individual scores
  const budgetResult = scoreBudget(job);
  const techResult = scoreTechMatch(job);
  const clientResult = scoreClientQuality(job);
  const clarityResult = scoreProjectClarity(job);
  const timingResult = scoreTiming(job);

  reasons.push(budgetResult.reason);
  reasons.push(techResult.reason);
  reasons.push(clientResult.reason);
  reasons.push(clarityResult.reason);
  reasons.push(timingResult.reason);

  // Calculate weighted total
  const breakdown: ScoreBreakdown = {
    budget: Math.round((budgetResult.score * weights.budget) / 100),
    techMatch: Math.round((techResult.score * weights.techMatch) / 100),
    clientQuality: Math.round((clientResult.score * weights.clientQuality) / 100),
    projectClarity: Math.round((clarityResult.score * weights.projectClarity) / 100),
    timing: Math.round((timingResult.score * weights.timing) / 100),
    bonuses: 0,
    penalties: 0,
  };

  const total = breakdown.budget + breakdown.techMatch + breakdown.clientQuality + breakdown.projectClarity + breakdown.timing;

  // Check for auto-reject conditions
  let autoReject = false;
  let rejectReason: string | undefined;

  if (techResult.score === 0) {
    autoReject = true;
    rejectReason = "No tech stack match";
  }

  if (budgetResult.score === 0) {
    autoReject = true;
    rejectReason = "Budget too low";
  }

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown,
    reasons,
    autoReject,
    rejectReason,
  };
}

export function getScoreCategory(score: number): string {
  if (score >= 85) return "hot";
  if (score >= 70) return "warm";
  if (score >= 50) return "maybe";
  return "pass";
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  const testJob: Partial<Job> = {
    title: "Senior Next.js Developer for SaaS Dashboard",
    description:
      "We need an experienced React/Next.js developer to build a modern dashboard for our SaaS platform. Must have experience with TypeScript, Tailwind CSS, and API integration. Looking for someone who can work independently and deliver clean, maintainable code. Project includes authentication, real-time updates, and data visualization. Example: similar to Vercel's dashboard.",
    budget_type: "fixed",
    budget_min: 2500,
    budget_max: 4000,
    skills: "React, Next.js, TypeScript, Tailwind CSS, Node.js",
    client_payment_verified: true,
    client_hire_rate: 75,
    client_total_spent: 25000,
    posted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  };

  const result = scoreJob(testJob);
  console.log("Score Result:", JSON.stringify(result, null, 2));
}
