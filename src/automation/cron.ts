import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { processVollnaJobs } from "../alerts/vollna.js";
import { sendJobAlert, sendDailyDigest, sendProposalReady } from "../alerts/discord.js";
import { generateProposal } from "../ai/proposalGen.js";
import {
  getJobsNeedingProposals,
  getQualifiedJobs,
  getStats,
  saveProposal,
  type Job,
} from "../db/tracker.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAST_DIGEST_PATH = join(__dirname, "../../data/.last_digest");

interface AutomationResult {
  jobsFetched: number;
  newJobs: number;
  qualifiedJobs: number;
  proposalsGenerated: number;
  alertsSent: number;
  digestSent: boolean;
}

async function sendAlertsForNewJobs(jobs: Job[]): Promise<number> {
  let alertsSent = 0;
  const hotThreshold = 80;

  for (const job of jobs) {
    if ((job.score || 0) >= hotThreshold) {
      const sent = await sendJobAlert(job);
      if (sent) {
        alertsSent++;
        console.log(`Alert sent for: ${job.title} (Score: ${job.score})`);
      }
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return alertsSent;
}

async function generatePendingProposals(): Promise<number> {
  const jobs = getJobsNeedingProposals(85);
  let generated = 0;

  console.log(`Found ${jobs.length} jobs needing proposals`);

  for (const job of jobs) {
    try {
      const { content, template } = generateProposal(job);
      saveProposal(job.id, content, template);
      generated++;
      console.log(`Proposal generated for: ${job.title} (Template: ${template})`);

      // Send notification
      await sendProposalReady(job, content);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate proposal for ${job.id}:`, error);
    }
  }

  return generated;
}

async function shouldSendDailyDigest(): Promise<boolean> {
  const now = new Date();
  const hour = now.getHours();

  // Send digest between 8-9 AM
  if (hour !== 8) return false;

  // Check if already sent today
  if (existsSync(LAST_DIGEST_PATH)) {
    const lastDigest = readFileSync(LAST_DIGEST_PATH, "utf-8");
    const lastDate = new Date(lastDigest);
    if (lastDate.toDateString() === now.toDateString()) {
      return false;
    }
  }

  return true;
}

async function markDigestSent(): Promise<void> {
  writeFileSync(LAST_DIGEST_PATH, new Date().toISOString());
}

export async function runAutomation(): Promise<AutomationResult> {
  console.log("\n" + "=".repeat(60));
  console.log(`Automation run started: ${new Date().toISOString()}`);
  console.log("=".repeat(60) + "\n");

  const result: AutomationResult = {
    jobsFetched: 0,
    newJobs: 0,
    qualifiedJobs: 0,
    proposalsGenerated: 0,
    alertsSent: 0,
    digestSent: false,
  };

  // Step 1: Fetch new jobs from Vollna
  console.log("Step 1: Fetching jobs from Vollna...");
  const fetchResult = await processVollnaJobs();
  result.jobsFetched = fetchResult.total;
  result.newJobs = fetchResult.new;
  result.qualifiedJobs = fetchResult.qualified;

  // Step 2: Send alerts for hot jobs
  console.log("\nStep 2: Sending alerts for hot jobs...");
  result.alertsSent = await sendAlertsForNewJobs(fetchResult.jobs);

  // Step 3: Generate proposals for high-score jobs
  console.log("\nStep 3: Generating proposals...");
  result.proposalsGenerated = await generatePendingProposals();

  // Step 4: Send daily digest if it's time
  console.log("\nStep 4: Checking daily digest...");
  if (await shouldSendDailyDigest()) {
    const qualifiedJobs = getQualifiedJobs(65);
    const stats = getStats(1); // Today's stats
    const sent = await sendDailyDigest(qualifiedJobs, stats);
    if (sent) {
      await markDigestSent();
      result.digestSent = true;
      console.log("Daily digest sent!");
    }
  } else {
    console.log("Daily digest not due yet");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Automation Summary:");
  console.log(`  Jobs fetched: ${result.jobsFetched}`);
  console.log(`  New jobs: ${result.newJobs}`);
  console.log(`  Qualified: ${result.qualifiedJobs}`);
  console.log(`  Proposals generated: ${result.proposalsGenerated}`);
  console.log(`  Alerts sent: ${result.alertsSent}`);
  console.log(`  Digest sent: ${result.digestSent}`);
  console.log("=".repeat(60) + "\n");

  return result;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runAutomation().then((result) => {
    console.log("Final result:", JSON.stringify(result, null, 2));
  });
}
