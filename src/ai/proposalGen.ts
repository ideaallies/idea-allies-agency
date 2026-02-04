import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { Job } from "../db/tracker.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesConfig = JSON.parse(
  readFileSync(join(__dirname, "../../config/templates.json"), "utf-8")
);
const profileConfig = JSON.parse(
  readFileSync(join(__dirname, "../../config/profile.json"), "utf-8")
);

interface Template {
  name: string;
  triggers: string[];
  structure: {
    hook: string;
    understanding: string;
    approach: string;
    proof: string;
    cta: string;
    signature: string;
  };
}

function selectTemplate(job: Job): Template {
  const text = `${job.title} ${job.description || ""} ${job.skills || ""}`.toLowerCase();
  const templates = templatesConfig.templates;

  // Check each template's triggers
  for (const [key, template] of Object.entries(templates) as [string, Template][]) {
    if (key === "generic") continue;
    for (const trigger of template.triggers) {
      if (text.includes(trigger.toLowerCase())) {
        return template;
      }
    }
  }

  return templates.generic;
}

function extractRequirements(description: string): string[] {
  const requirements: string[] = [];
  const lines = description.split(/[.\n]/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 20) continue;

    // Look for requirement indicators
    if (
      trimmed.toLowerCase().includes("need") ||
      trimmed.toLowerCase().includes("must") ||
      trimmed.toLowerCase().includes("should") ||
      trimmed.toLowerCase().includes("require") ||
      trimmed.toLowerCase().includes("looking for") ||
      trimmed.toLowerCase().includes("want")
    ) {
      requirements.push(`• ${trimmed.substring(0, 100)}`);
    }
  }

  // Fallback: extract key phrases
  if (requirements.length === 0) {
    const skills = description.match(/\b(build|create|develop|implement|design|integrate)\s+\w+/gi) || [];
    requirements.push(...skills.slice(0, 3).map((s) => `• ${s}`));
  }

  return requirements.slice(0, 4);
}

function generateClarifyingQuestion(job: Job): string {
  const questions = [
    "Do you have existing designs/wireframes, or should I propose a UI approach?",
    "What's your target timeline for the MVP/first version?",
    "Are there any existing codebases or APIs this needs to integrate with?",
    "What's your preferred communication style — async updates or daily syncs?",
    "Do you have specific examples of similar products you like?",
  ];

  // Context-aware question selection
  const desc = (job.description || "").toLowerCase();

  if (desc.includes("design") || desc.includes("ui") || desc.includes("figma")) {
    return "Are the designs finalized, or is there flexibility in the UI approach?";
  }
  if (desc.includes("api") || desc.includes("integrate") || desc.includes("backend")) {
    return "Is there API documentation available, or will I be designing the endpoints?";
  }
  if (desc.includes("mvp") || desc.includes("startup") || desc.includes("launch")) {
    return "What's your must-have features for launch vs. nice-to-haves for later?";
  }
  if (desc.includes("bug") || desc.includes("fix") || desc.includes("issue")) {
    return "Can you share error logs or reproduction steps to help me estimate accurately?";
  }

  return questions[Math.floor(Math.random() * questions.length)];
}

function formatBudget(job: Job): string {
  if (job.budget_type === "hourly" && job.hourly_rate_min) {
    return `$${job.hourly_rate_min}/hr`;
  }
  if (job.budget_min) {
    return `$${job.budget_min.toLocaleString()}`;
  }
  return "your budget";
}

function getRelevantPortfolio(job: Job): string {
  const portfolio = profileConfig.portfolio.highlights || [];
  if (portfolio.length === 0) {
    return "my GitHub portfolio (github.com/olatunbell)";
  }

  // Match portfolio to job keywords
  const keywords = (job.skills || "").toLowerCase().split(",").map((s: string) => s.trim());
  for (const item of portfolio) {
    for (const keyword of keywords) {
      if (item.toLowerCase().includes(keyword)) {
        return item;
      }
    }
  }

  return portfolio[0] || "my GitHub portfolio (github.com/olatunbell)";
}

export function generateProposal(job: Job): { content: string; template: string } {
  const template = selectTemplate(job);
  const requirements = extractRequirements(job.description || "");
  const bulletPoints = requirements.length > 0 ? requirements.join("\n") : "• Your core requirements as described above";
  const clarifyingQuestion = generateClarifyingQuestion(job);
  const portfolioLink = getRelevantPortfolio(job);

  // Determine project specifics
  const techStack = profileConfig.agency.techStack;
  const relevantTech: string[] = [];
  const jobText = `${job.title} ${job.description || ""} ${job.skills || ""}`.toLowerCase();

  for (const [category, techs] of Object.entries(techStack) as [string, string[]][]) {
    for (const tech of techs) {
      if (jobText.includes(tech.toLowerCase())) {
        relevantTech.push(tech);
      }
    }
  }

  const techStackStr = relevantTech.length > 0 ? relevantTech.slice(0, 4).join(", ") : "Next.js, React, TypeScript";

  // Build proposal sections
  let proposal = "";

  // Hook
  const hook = template.structure.hook
    .replace("{scale}", "thousands of users")
    .replace("{projectName}", job.title.split(" ").slice(0, 5).join(" "))
    .replace("{specificDetail}", `your focus on ${relevantTech[0] || "modern development"}`)
    .replace("{techStack}", techStackStr);
  proposal += hook + "\n\n";

  // Understanding
  const understanding = template.structure.understanding.replace("{bulletPoints}", bulletPoints);
  proposal += understanding + "\n\n";

  // Approach
  let approach = template.structure.approach;
  if (approach.includes("{phase1}")) {
    approach = approach
      .replace("{phase1}", "Core architecture & database design")
      .replace("{phase2}", "Feature implementation & API development")
      .replace("{phase3}", "Testing, polish & deployment");
  }
  if (approach.includes("{approach}")) {
    approach = approach.replace(
      "{approach}",
      "1. Understand your codebase\n2. Implement features incrementally\n3. Test thoroughly\n4. Document and deploy"
    );
  }
  if (approach.includes("{timeline}")) {
    approach = approach.replace("{timeline}", "2-3 weeks");
  }
  proposal += approach + "\n\n";

  // Proof
  const proof = template.structure.proof
    .replace("{portfolioLink}", portfolioLink)
    .replace("{project1}", portfolioLink)
    .replace("{project2}", "Similar projects in my portfolio")
    .replace("{issueType}", "similar")
    .replace("{projectType}", "web application")
    .replace("{duration}", "6+ months");
  proposal += proof + "\n\n";

  // CTA
  const cta = template.structure.cta.replace("{clarifyingQuestion}", clarifyingQuestion);
  proposal += cta + "\n\n";

  // Signature
  proposal += template.structure.signature;

  // Clean up
  proposal = proposal.replace(/\n{3,}/g, "\n\n").trim();

  // Ensure we're under max length
  const maxLength = templatesConfig.formatting.maxLength;
  if (proposal.length > maxLength) {
    proposal = proposal.substring(0, maxLength - 3) + "...";
  }

  return { content: proposal, template: template.name };
}

export function getProposalPreview(job: Job): string {
  const { content } = generateProposal(job);
  return content.substring(0, 300) + "...";
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  const testJob: Job = {
    id: "test123",
    title: "Build a Next.js Dashboard with Real-time Features",
    description: `We need an experienced developer to build a modern admin dashboard.

Requirements:
- User authentication with role-based access
- Real-time data updates using websockets
- Integration with our existing REST API
- Mobile-responsive design using Tailwind CSS
- Data visualization with charts

Looking for someone with strong React/Next.js experience who can work independently.
Must have experience with TypeScript and modern frontend practices.`,
    url: "https://upwork.com/jobs/~test123",
    skills: "React, Next.js, TypeScript, Tailwind CSS, WebSocket",
    budget_type: "fixed",
    budget_min: 2500,
    budget_max: 4000,
    status: "qualified",
    score: 88,
  };

  const result = generateProposal(testJob);
  console.log("Template:", result.template);
  console.log("\n" + "=".repeat(60) + "\n");
  console.log(result.content);
  console.log("\n" + "=".repeat(60));
  console.log(`Length: ${result.content.length} characters`);
}
