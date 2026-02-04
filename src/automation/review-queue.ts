import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getQualifiedJobs, type Job } from "../db/tracker.js";
import { format } from "date-fns";

const __dirname = dirname(fileURLToPath(import.meta.url));

function formatJobForReview(job: Job, index: number): string {
  let output = "";

  output += `\n${"=".repeat(70)}\n`;
  output += `JOB #${index + 1} | Score: ${job.score}/100 | ID: ${job.id}\n`;
  output += `${"=".repeat(70)}\n\n`;

  output += `**${job.title}**\n`;
  output += `URL: ${job.url}\n`;
  output += `Posted: ${job.posted_at ? format(new Date(job.posted_at), "MMM d, yyyy h:mm a") : "Unknown"}\n`;

  // Budget
  if (job.budget_type === "hourly" && job.hourly_rate_min) {
    output += `Budget: $${job.hourly_rate_min}${job.hourly_rate_max ? `-$${job.hourly_rate_max}` : ""}/hr\n`;
  } else if (job.budget_min) {
    output += `Budget: $${job.budget_min.toLocaleString()}${job.budget_max && job.budget_max !== job.budget_min ? ` - $${job.budget_max.toLocaleString()}` : ""} (fixed)\n`;
  }

  output += `Skills: ${job.skills || "Not specified"}\n`;
  output += `Status: ${job.status}\n`;

  // Score breakdown
  if (job.score_breakdown) {
    try {
      const breakdown = JSON.parse(job.score_breakdown);
      output += `\nScore Breakdown:\n`;
      output += `  Budget: ${breakdown.budget}/25 | Tech: ${breakdown.techMatch}/30 | Client: ${breakdown.clientQuality}/20\n`;
      output += `  Clarity: ${breakdown.projectClarity}/15 | Timing: ${breakdown.timing}/10\n`;
    } catch {
      // Ignore parse errors
    }
  }

  // Description
  output += `\n--- Description ---\n`;
  output += `${job.description || "No description"}\n`;

  // Proposal if generated
  if (job.proposal_text) {
    output += `\n--- Generated Proposal (Template: ${job.proposal_template || "Unknown"}) ---\n`;
    output += `${job.proposal_text}\n`;
  }

  // Action commands
  output += `\n--- Actions ---\n`;
  output += `Submit: bun run submit ${job.id}\n`;
  output += `Mark submitted: bun run status ${job.id} submitted\n`;
  output += `Mark won: bun run status ${job.id} won "Contract details"\n`;
  output += `Mark lost: bun run status ${job.id} lost\n`;

  return output;
}

export function generateReviewFile(minScore: number = 65): string {
  const jobs = getQualifiedJobs(minScore);
  const now = format(new Date(), "yyyy-MM-dd_HH-mm");
  const filename = `review_queue_${now}.md`;
  const filepath = join(__dirname, "../../data", filename);

  let content = `# Idea Allies - Job Review Queue\n`;
  content += `Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}\n`;
  content += `Total qualified jobs: ${jobs.length}\n`;
  content += `Minimum score filter: ${minScore}\n`;

  // Summary
  const byScore = {
    hot: jobs.filter((j) => (j.score || 0) >= 85),
    warm: jobs.filter((j) => (j.score || 0) >= 70 && (j.score || 0) < 85),
    maybe: jobs.filter((j) => (j.score || 0) >= 50 && (j.score || 0) < 70),
  };

  content += `\n## Summary\n`;
  content += `🔥 Hot (85+): ${byScore.hot.length}\n`;
  content += `⭐ Warm (70-84): ${byScore.warm.length}\n`;
  content += `👀 Maybe (50-69): ${byScore.maybe.length}\n`;

  // Jobs needing proposals
  const needsProposal = jobs.filter((j) => !j.proposal_text && (j.score || 0) >= 85);
  if (needsProposal.length > 0) {
    content += `\n⚠️ **${needsProposal.length} hot jobs without proposals!**\n`;
    content += `Run: bun run batch-propose\n`;
  }

  // Quick action list
  content += `\n## Quick Actions\n`;
  content += `\`\`\`bash\n`;
  content += `# Submit all ready proposals\n`;
  jobs
    .filter((j) => j.proposal_text && j.status !== "submitted")
    .slice(0, 5)
    .forEach((j) => {
      content += `bun run submit ${j.id}  # ${j.title.substring(0, 40)}...\n`;
    });
  content += `\`\`\`\n`;

  // Individual jobs
  content += `\n# Individual Jobs\n`;

  // Hot jobs first
  if (byScore.hot.length > 0) {
    content += `\n## 🔥 Hot Jobs (Score 85+)\n`;
    byScore.hot.forEach((job, i) => {
      content += formatJobForReview(job, i);
    });
  }

  // Warm jobs
  if (byScore.warm.length > 0) {
    content += `\n## ⭐ Warm Jobs (Score 70-84)\n`;
    byScore.warm.forEach((job, i) => {
      content += formatJobForReview(job, i);
    });
  }

  // Maybe jobs (only show first 5)
  if (byScore.maybe.length > 0) {
    content += `\n## 👀 Maybe Jobs (Score 50-69) - First 5\n`;
    byScore.maybe.slice(0, 5).forEach((job, i) => {
      content += formatJobForReview(job, i);
    });
    if (byScore.maybe.length > 5) {
      content += `\n... and ${byScore.maybe.length - 5} more. Run with lower threshold to see all.\n`;
    }
  }

  writeFileSync(filepath, content);
  console.log(`Review file created: ${filepath}`);

  return filepath;
}

export function printReviewSummary(): void {
  const jobs = getQualifiedJobs(50);

  console.log("\n" + "=".repeat(60));
  console.log("QUALIFIED JOBS SUMMARY");
  console.log("=".repeat(60));

  const hot = jobs.filter((j) => (j.score || 0) >= 85);
  const warm = jobs.filter((j) => (j.score || 0) >= 70 && (j.score || 0) < 85);
  const maybe = jobs.filter((j) => (j.score || 0) >= 50 && (j.score || 0) < 70);

  console.log(`\n🔥 Hot (85+): ${hot.length}`);
  hot.forEach((j) => console.log(`   ${j.score} | ${j.title.substring(0, 50)}...`));

  console.log(`\n⭐ Warm (70-84): ${warm.length}`);
  warm.slice(0, 5).forEach((j) => console.log(`   ${j.score} | ${j.title.substring(0, 50)}...`));

  console.log(`\n👀 Maybe (50-69): ${maybe.length}`);

  // Pending actions
  const needsProposal = jobs.filter((j) => !j.proposal_text && (j.score || 0) >= 85);
  const needsSubmission = jobs.filter((j) => j.proposal_text && j.status !== "submitted");

  console.log("\n" + "-".repeat(60));
  console.log("PENDING ACTIONS:");
  console.log(`   Proposals to generate: ${needsProposal.length}`);
  console.log(`   Proposals to submit: ${needsSubmission.length}`);

  if (needsSubmission.length > 0) {
    console.log("\nReady to submit:");
    needsSubmission.slice(0, 3).forEach((j) => {
      console.log(`   bun run submit ${j.id}`);
    });
  }

  console.log("=".repeat(60) + "\n");
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === "file") {
    generateReviewFile();
  } else {
    printReviewSummary();
  }
}
