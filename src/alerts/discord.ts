import type { Job } from "../db/tracker.js";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface DiscordEmbed {
  title: string;
  description: string;
  url?: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

function getScoreColor(score: number): number {
  if (score >= 85) return 0x00ff00; // Green - hot
  if (score >= 70) return 0xffff00; // Yellow - warm
  if (score >= 50) return 0xffa500; // Orange - maybe
  return 0xff0000; // Red - pass
}

function getScoreEmoji(score: number): string {
  if (score >= 85) return "🔥";
  if (score >= 70) return "⭐";
  if (score >= 50) return "👀";
  return "❄️";
}

function formatBudget(job: Job): string {
  if (job.budget_type === "hourly" && job.hourly_rate_min) {
    const max = job.hourly_rate_max ? `- $${job.hourly_rate_max}` : "";
    return `$${job.hourly_rate_min}${max}/hr`;
  }
  if (job.budget_min) {
    const max = job.budget_max && job.budget_max !== job.budget_min ? ` - $${job.budget_max}` : "";
    return `$${job.budget_min}${max} (fixed)`;
  }
  return "Not specified";
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

export async function sendJobAlert(job: Job): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.error("DISCORD_WEBHOOK_URL not set");
    return false;
  }

  const score = job.score || 0;
  const emoji = getScoreEmoji(score);

  const embed: DiscordEmbed = {
    title: `${emoji} ${truncate(job.title, 200)}`,
    description: truncate(job.description || "No description", 500),
    url: job.url,
    color: getScoreColor(score),
    fields: [
      { name: "Score", value: `${score}/100`, inline: true },
      { name: "Budget", value: formatBudget(job), inline: true },
      { name: "Skills", value: truncate(job.skills || "Not listed", 100), inline: false },
    ],
    footer: { text: `Job ID: ${job.id}` },
    timestamp: job.posted_at || new Date().toISOString(),
  };

  if (job.client_country) {
    embed.fields.push({ name: "Client", value: job.client_country, inline: true });
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Idea Allies Pipeline",
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error("Discord webhook failed:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending Discord alert:", error);
    return false;
  }
}

export async function sendDailyDigest(jobs: Job[], stats: any): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.error("DISCORD_WEBHOOK_URL not set");
    return false;
  }

  const hotJobs = jobs.filter((j) => (j.score || 0) >= 85);
  const warmJobs = jobs.filter((j) => (j.score || 0) >= 70 && (j.score || 0) < 85);

  let description = `**Today's Pipeline Summary**\n\n`;
  description += `📊 **Stats**\n`;
  description += `• Total jobs fetched: ${stats.total_jobs || 0}\n`;
  description += `• Qualified jobs (65+): ${stats.qualified_jobs || 0}\n`;
  description += `• Proposals generated: ${stats.proposals_generated || 0}\n`;
  description += `• Submitted: ${stats.submitted || 0}\n`;
  description += `• Won: ${stats.won || 0}\n\n`;

  if (hotJobs.length > 0) {
    description += `🔥 **Hot Jobs (85+)**: ${hotJobs.length}\n`;
    hotJobs.slice(0, 3).forEach((j) => {
      description += `• [${truncate(j.title, 50)}](${j.url}) - Score: ${j.score}\n`;
    });
    description += "\n";
  }

  if (warmJobs.length > 0) {
    description += `⭐ **Warm Jobs (70-84)**: ${warmJobs.length}\n`;
    warmJobs.slice(0, 3).forEach((j) => {
      description += `• [${truncate(j.title, 50)}](${j.url}) - Score: ${j.score}\n`;
    });
  }

  const embed: DiscordEmbed = {
    title: "📋 Daily Pipeline Digest",
    description,
    color: 0x5865f2,
    fields: [],
    footer: { text: "Idea Allies Upwork Automation" },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Idea Allies Pipeline",
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error("Discord webhook failed:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending Discord digest:", error);
    return false;
  }
}

export async function sendProposalReady(job: Job, proposal: string): Promise<boolean> {
  if (!WEBHOOK_URL) return false;

  const embed: DiscordEmbed = {
    title: `📝 Proposal Ready: ${truncate(job.title, 150)}`,
    description: `A proposal has been generated for this job.\n\n**Score:** ${job.score}/100\n**Budget:** ${formatBudget(job)}\n\n[Open Job](${job.url})`,
    url: job.url,
    color: 0x00ff00,
    fields: [{ name: "Proposal Preview", value: truncate(proposal, 500), inline: false }],
    footer: { text: `Run: bun run submit ${job.id}` },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Idea Allies Pipeline",
        embeds: [embed],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Test function
async function test() {
  const testJob: Job = {
    id: "test123",
    title: "Test Job: Build a Next.js Dashboard",
    description: "Looking for an experienced React/Next.js developer to build a modern dashboard...",
    url: "https://www.upwork.com/jobs/~test123",
    score: 88,
    budget_type: "fixed",
    budget_min: 2000,
    budget_max: 3000,
    skills: "React, Next.js, TypeScript, Tailwind CSS",
    client_country: "United States",
    status: "qualified",
  };

  console.log("Sending test alert...");
  const result = await sendJobAlert(testJob);
  console.log("Result:", result ? "Success" : "Failed");
}

// CLI execution
if (process.argv[2] === "test") {
  test();
}
