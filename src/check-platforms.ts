import "dotenv/config";

const API_BASE = "https://api.vollna.com/v1";
const token = process.env.VOLLNA_API_TOKEN;

async function checkFilters() {
  // Get filters
  const filtersRes = await fetch(API_BASE + "/filters", {
    headers: { "X-API-TOKEN": token!, "Accept": "application/json" }
  });
  const filters = await filtersRes.json();

  console.log("=== YOUR FILTERS ===");
  filters.data?.forEach((f: any) => console.log("  -", f.name, "(ID:", f.id + ")"));

  // Check ALL projects across all filters
  const sites: Record<string, number> = {};

  for (const filter of (filters.data || [])) {
    const projectsRes = await fetch(API_BASE + "/filters/" + filter.id + "/projects?limit=50", {
      headers: { "X-API-TOKEN": token!, "Accept": "application/json" }
    });
    const projects = await projectsRes.json();

    if (projects.data) {
      projects.data.forEach((p: any) => {
        const site = p.site || "unknown";
        sites[site] = (sites[site] || 0) + 1;
      });
    }
  }

  console.log("\n=== PLATFORMS IN YOUR RESULTS ===");
  Object.entries(sites).forEach(([site, count]) => {
    console.log("  ✓", site + ":", count, "jobs");
  });

  const allPlatforms = ["upwork", "freelancer", "guru", "peopleperhour"];
  const foundPlatforms = Object.keys(sites).map(s => s.toLowerCase());
  const missing = allPlatforms.filter(p => !foundPlatforms.some(f => f.includes(p)));

  if (missing.length > 0) {
    console.log("\n=== MISSING PLATFORMS (no jobs found) ===");
    missing.forEach(p => console.log("  ✗", p, "- enable in Vollna filter settings"));
  } else {
    console.log("\n✓ All 4 platforms returning jobs!");
  }
}

checkFilters().catch(console.error);
