import { processVollnaJobs } from "../alerts/vollna.js";
import { sendJobAlert, sendDailyDigest } from "../alerts/discord.js";
import { generateProposal } from "../ai/proposalGen.js";
import { scoreJob } from "../ai/scorer.js";
import { generateReviewFile, printReviewSummary } from "../automation/review-queue.js";
import { syncPortfolio, listPortfolio } from "../portfolio/github.js";
import {
  getAllJobs,
  getJob,
  getJobsByStatus,
  getQualifiedJobs,
  getJobsNeedingProposals,
  getStats,
  saveProposal,
  updateJobStatus,
  markProposalSubmitted,
  recordResponse,
  type Job,
} from "../db/tracker.js";

const commands: Record<string, (args: string[]) => Promise<void> | void> = {
  fetch: cmdFetch,
  jobs: cmdJobs,
  propose: cmdPropose,
  "batch-propose": cmdBatchPropose,
  review: cmdReview,
  submit: cmdSubmit,
  status: cmdStatus,
  track: cmdTrack,
  stats: cmdStats,
  digest: cmdDigest,
  portfolio: cmdPortfolio,
  help: cmdHelp,
};

async function cmdFetch() {
  console.log("Fetching jobs from Vollna...");
  const result = await processVollnaJobs();
  console.log(`\nResults:`);
  console.log(`  Total fetched: ${result.total}`);
  console.log(`  New jobs: ${result.new}`);
  console.log(`  Qualified (65+): ${result.qualified}`);

  // Show qualified jobs
  if (result.jobs.length > 0) {
    const qualified = result.jobs.filter((j) => (j.score || 0) >= 50);
    if (qualified.length > 0) {
      console.log("\nQualified jobs:");
      qualified.forEach((j) => {
        console.log(`  ${j.score} | ${j.title.substring(0, 50)}...`);
      });
    }
  }
}

function cmdJobs(args: string[]) {
  const filter = args[0] || "qualified";
  let jobs: Job[];

  switch (filter) {
    case "all":
      jobs = getAllJobs(50);
      break;
    case "hot":
      jobs = getQualifiedJobs(55);
      break;
    case "warm":
      jobs = getQualifiedJobs(60).filter((j) => (j.score || 0) < 70);
      break;
    case "pending":
      jobs = getJobsNeedingProposals(85);
      break;
    case "submitted":
      jobs = getJobsByStatus("submitted");
      break;
    default:
      jobs = getQualifiedJobs(65);
  }

  console.log(`\n${filter.toUpperCase()} JOBS (${jobs.length})`);
  console.log("=".repeat(60));

  if (jobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  jobs.forEach((job, i) => {
    const budget = job.budget_type === "hourly"
      ? `$${job.hourly_rate_min}/hr`
      : `$${job.budget_min || "?"}`;
    const proposal = job.proposal_text ? "✓" : "○";

    console.log(`\n${i + 1}. [${job.score}] ${job.title.substring(0, 50)}`);
    console.log(`   ID: ${job.id} | Budget: ${budget} | Proposal: ${proposal} | Status: ${job.status}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("Commands: bun run propose <id> | bun run submit <id>");
}

async function cmdPropose(args: string[]) {
  const jobId = args[0];

  if (!jobId) {
    console.error("Usage: bun run propose <job-id>");
    return;
  }

  const job = getJob(jobId);
  if (!job) {
    console.error(`Job not found: ${jobId}`);
    return;
  }

  console.log(`Generating proposal for: ${job.title}`);

  const { content, template } = generateProposal(job);
  saveProposal(job.id, content, template);

  console.log(`\nTemplate used: ${template}`);
  console.log("\n" + "=".repeat(60));
  console.log(content);
  console.log("=".repeat(60));
  console.log(`\nProposal saved! Length: ${content.length} chars`);
  console.log(`Submit: bun run submit ${job.id}`);
}

async function cmdBatchPropose() {
  const jobs = getJobsNeedingProposals(85);

  if (jobs.length === 0) {
    console.log("No jobs need proposals.");
    return;
  }

  console.log(`Generating proposals for ${jobs.length} jobs...`);

  for (const job of jobs) {
    try {
      const { content, template } = generateProposal(job);
      saveProposal(job.id, content, template);
      console.log(`✓ ${job.id}: ${template}`);
    } catch (error) {
      console.error(`✗ ${job.id}: Failed`);
    }
  }

  console.log("\nDone! Run `bun run review` to see all proposals.");
}

function cmdReview(args: string[]) {
  const mode = args[0];

  if (mode === "file") {
    const filepath = generateReviewFile();
    console.log(`Review file created: ${filepath}`);
  } else {
    printReviewSummary();
  }
}

async function cmdSubmit(args: string[]) {
  const jobId = args[0];

  if (!jobId) {
    console.error("Usage: bun run submit <job-id>");
    return;
  }

  const job = getJob(jobId);
  if (!job) {
    console.error(`Job not found: ${jobId}`);
    return;
  }

  if (!job.proposal_text) {
    console.error("No proposal generated. Run: bun run propose " + jobId);
    return;
  }

  // Copy to clipboard
  try {
    const { default: clipboardy } = await import("clipboardy");
    await clipboardy.write(job.proposal_text);
    console.log("✓ Proposal copied to clipboard!");
  } catch {
    console.log("Could not copy to clipboard. Proposal:");
    console.log("\n" + "=".repeat(60));
    console.log(job.proposal_text);
    console.log("=".repeat(60) + "\n");
  }

  // Open URL
  try {
    const { default: open } = await import("open");
    await open(job.url);
    console.log("✓ Opening job in browser...");
  } catch {
    console.log(`Open manually: ${job.url}`);
  }

  console.log("\nAfter submitting, run:");
  console.log(`  bun run status ${jobId} submitted`);
}

function cmdStatus(args: string[]) {
  const [jobId, status, ...noteWords] = args;
  const note = noteWords.join(" ");

  if (!jobId || !status) {
    console.error("Usage: bun run status <job-id> <status> [notes]");
    console.error("Statuses: submitted, responded, won, lost, rejected");
    return;
  }

  const job = getJob(jobId);
  if (!job) {
    console.error(`Job not found: ${jobId}`);
    return;
  }

  const validStatuses = ["submitted", "responded", "won", "lost", "rejected"];
  if (!validStatuses.includes(status)) {
    console.error(`Invalid status. Use: ${validStatuses.join(", ")}`);
    return;
  }

  if (status === "submitted") {
    markProposalSubmitted(jobId);
    console.log(`✓ Marked as submitted: ${job.title}`);
  } else if (["responded", "won", "lost"].includes(status)) {
    recordResponse(jobId, status as "responded" | "won" | "lost", note);
    console.log(`✓ Marked as ${status}: ${job.title}`);
    if (note) console.log(`  Notes: ${note}`);
  } else {
    updateJobStatus(jobId, status, note);
    console.log(`✓ Status updated to ${status}`);
  }
}

function cmdTrack() {
  const jobs = getAllJobs(100);

  const byStatus: Record<string, number> = {};
  jobs.forEach((j) => {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
  });

  console.log("\n" + "=".repeat(60));
  console.log("PIPELINE STATUS");
  console.log("=".repeat(60));

  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  const stats = getStats(30);
  console.log("\nLast 30 days:");
  console.log(`  Total jobs: ${stats.total_jobs}`);
  console.log(`  Qualified: ${stats.qualified_jobs}`);
  console.log(`  Proposals: ${stats.proposals_generated}`);
  console.log(`  Submitted: ${stats.submitted}`);
  console.log(`  Won: ${stats.won}`);
  console.log("=".repeat(60) + "\n");
}

function cmdStats() {
  const stats7 = getStats(7);
  const stats30 = getStats(30);

  console.log("\n" + "=".repeat(60));
  console.log("PIPELINE STATISTICS");
  console.log("=".repeat(60));

  console.log("\nLast 7 days:");
  console.log(`  Jobs fetched: ${stats7.total_jobs}`);
  console.log(`  Qualified (65+): ${stats7.qualified_jobs}`);
  console.log(`  Proposals: ${stats7.proposals_generated}`);
  console.log(`  Submitted: ${stats7.submitted}`);
  console.log(`  Responses: ${stats7.responses}`);
  console.log(`  Won: ${stats7.won}`);
  console.log(`  Avg score: ${stats7.avg_score?.toFixed(1) || "N/A"}`);

  console.log("\nLast 30 days:");
  console.log(`  Jobs fetched: ${stats30.total_jobs}`);
  console.log(`  Qualified (65+): ${stats30.qualified_jobs}`);
  console.log(`  Proposals: ${stats30.proposals_generated}`);
  console.log(`  Submitted: ${stats30.submitted}`);
  console.log(`  Responses: ${stats30.responses}`);
  console.log(`  Won: ${stats30.won}`);

  // Conversion rates
  if (stats30.submitted > 0) {
    const responseRate = ((stats30.responses / stats30.submitted) * 100).toFixed(1);
    const winRate = ((stats30.won / stats30.submitted) * 100).toFixed(1);
    console.log(`\nConversion (30d):`);
    console.log(`  Response rate: ${responseRate}%`);
    console.log(`  Win rate: ${winRate}%`);
  }

  console.log("=".repeat(60) + "\n");
}

async function cmdDigest() {
  const jobs = getQualifiedJobs(65);
  const stats = getStats(1);

  console.log("Sending daily digest to Discord...");
  const sent = await sendDailyDigest(jobs, stats);

  if (sent) {
    console.log("✓ Digest sent successfully!");
  } else {
    console.log("✗ Failed to send digest. Check DISCORD_WEBHOOK_URL.");
  }
}

async function cmdPortfolio(args: string[]) {
  const subcommand = args[0] || "sync";

  if (subcommand === "list") {
    listPortfolio();
  } else {
    await syncPortfolio();
  }
}

function cmdHelp() {
  console.log(`
Idea Allies Upwork Pipeline
===========================

Commands:
  bun run auto           Full automation cycle
  bun run fetch          Fetch new jobs from Vollna
  bun run jobs [filter]  List jobs (all|hot|warm|pending|submitted)
  bun run propose <id>   Generate proposal for a job
  bun run batch-propose  Generate all pending proposals
  bun run review         Show review summary
  bun run review file    Generate review file
  bun run submit <id>    Copy proposal & open job URL
  bun run status <id> <status> [notes]  Update job status
  bun run track          Show pipeline status
  bun run stats          Show detailed statistics
  bun run digest         Send daily digest to Discord
  bun run portfolio      Sync GitHub repos (won't touch showcase)
  bun run portfolio list Show showcase + new un-curated repos
  bun run test-discord   Test Discord webhook

Status values: submitted, responded, won, lost, rejected

Examples:
  bun run jobs hot
  bun run propose abc123
  bun run status abc123 submitted
  bun run status abc123 won "Signed $5k contract"
`);
}

// Main
const [, , command, ...args] = process.argv;

if (!command || !commands[command]) {
  cmdHelp();
} else {
  commands[command](args);
}
