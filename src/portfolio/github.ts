import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = join(__dirname, "../../config/profile.json");

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  pushed_at: string;
  private: boolean;
}

interface PortfolioItem {
  name: string;
  description: string;
  url: string;
  liveUrl?: string;
  language?: string;
  topics: string[];
  stars: number;
  lastUpdated: string;
  isPrivate: boolean;
}

async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Idea-Allies-Portfolio-Sync",
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const url = token
      ? `https://api.github.com/user/repos?per_page=100&page=${page}&sort=pushed`
      : `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=pushed`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);
      break;
    }

    const pageRepos: GitHubRepo[] = await response.json();
    if (pageRepos.length === 0) break;

    repos.push(...pageRepos);
    page++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return repos;
}

function filterAndRankRepos(repos: GitHubRepo[]): PortfolioItem[] {
  const relevantLanguages = [
    "TypeScript",
    "JavaScript",
    "Python",
    "Go",
    "Rust",
    "HTML",
    "CSS",
  ];

  const relevantTopics = [
    "nextjs",
    "react",
    "typescript",
    "nodejs",
    "tailwind",
    "api",
    "fullstack",
    "web",
    "dashboard",
    "saas",
  ];

  return repos
    .filter((repo) => {
      // Filter out forks (usually), very old repos, etc.
      const lastPushed = new Date(repo.pushed_at);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 2);

      return (
        lastPushed > oneYearAgo &&
        (relevantLanguages.includes(repo.language || "") ||
          repo.topics.some((t) => relevantTopics.includes(t.toLowerCase())))
      );
    })
    .map((repo) => ({
      name: repo.name,
      description: repo.description || "No description",
      url: repo.html_url,
      liveUrl: repo.homepage || undefined,
      language: repo.language || undefined,
      topics: repo.topics,
      stars: repo.stargazers_count,
      lastUpdated: repo.pushed_at,
      isPrivate: repo.private,
    }))
    .sort((a, b) => {
      // Sort by: stars, then recency
      if (b.stars !== a.stars) return b.stars - a.stars;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });
}

function generateHighlights(repos: PortfolioItem[]): string[] {
  const highlights: string[] = [];

  // Top starred repos
  const starred = repos.filter((r) => r.stars > 0);
  if (starred.length > 0) {
    highlights.push(`${starred[0].name} (${starred[0].stars} stars) - ${starred[0].description}`);
  }

  // Recent active projects
  const recent = repos.slice(0, 5);
  for (const repo of recent) {
    if (!highlights.some((h) => h.includes(repo.name))) {
      highlights.push(`${repo.name} - ${repo.description}`);
    }
    if (highlights.length >= 5) break;
  }

  return highlights;
}

export async function syncPortfolio(): Promise<void> {
  console.log("Syncing portfolio from GitHub...");

  const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf-8"));
  const username = profile.owner.github;

  const repos = await fetchGitHubRepos(username);
  console.log(`Fetched ${repos.length} repos from GitHub`);

  const portfolioItems = filterAndRankRepos(repos);
  console.log(`Filtered to ${portfolioItems.length} relevant repos`);

  const highlights = generateHighlights(portfolioItems);

  // Update profile
  profile.portfolio.repos = portfolioItems;
  profile.portfolio.highlights = highlights;
  profile.portfolio.lastSynced = new Date().toISOString();

  writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));

  console.log("\nPortfolio synced successfully!");
  console.log(`  Total repos: ${portfolioItems.length}`);
  console.log(`  Public: ${portfolioItems.filter((r) => !r.isPrivate).length}`);
  console.log(`  Private: ${portfolioItems.filter((r) => r.isPrivate).length}`);
  console.log("\nHighlights:");
  highlights.forEach((h) => console.log(`  • ${h}`));
}

export function listPortfolio(): void {
  const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf-8"));
  const repos: PortfolioItem[] = profile.portfolio.repos || [];

  console.log("\n" + "=".repeat(60));
  console.log("PORTFOLIO");
  console.log("=".repeat(60));
  console.log(`Last synced: ${profile.portfolio.lastSynced || "Never"}`);
  console.log(`Total projects: ${repos.length}`);

  if (repos.length > 0) {
    console.log("\nTop Projects:");
    repos.slice(0, 10).forEach((repo, i) => {
      const stars = repo.stars > 0 ? ` ⭐${repo.stars}` : "";
      const priv = repo.isPrivate ? " 🔒" : "";
      console.log(`${i + 1}. ${repo.name}${stars}${priv}`);
      console.log(`   ${repo.description}`);
      if (repo.liveUrl) console.log(`   Live: ${repo.liveUrl}`);
    });
  }

  if (profile.portfolio.highlights?.length > 0) {
    console.log("\nHighlights for proposals:");
    profile.portfolio.highlights.forEach((h: string) => console.log(`  • ${h}`));
  }

  console.log("=".repeat(60) + "\n");
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "sync";

  if (command === "list") {
    listPortfolio();
  } else {
    syncPortfolio().catch(console.error);
  }
}
