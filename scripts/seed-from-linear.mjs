/**
 * Seed engcal with historical Linear tickets
 *
 * Queries all completed issues from the past 6 months,
 * pulls startedAt + "In Review" history, posts to engcal.
 *
 * Run: node scripts/seed-from-linear.mjs
 */

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const ENGCAL_URL = process.env.ENGCAL_URL || "https://engcal.vercel.app";
const ENGCAL_SECRET = process.env.ENGCAL_SECRET || "engcal-secret-2026";

// April 2026 only
const SINCE = new Date("2026-04-01T00:00:00.000Z");
const UNTIL = new Date("2026-04-30T23:59:59.999Z");

// Detect project from team name or issue identifier prefix
function detectProject(issue) {
  const name = (issue.team?.name ?? "").toLowerCase();
  const id = (issue.identifier ?? "").toLowerCase();
  if (name.includes("mobile") || name.includes("react-native")) return "mobile";
  if (name.includes("server") || name.includes("backend") || name.includes("function")) return "functions";
  if (name.includes("web") || name.includes("frontend")) return "web";
  // fallback: use identifier prefix if known
  return "web";
}

async function linearQuery(query) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": LINEAR_API_KEY },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
  return res.json();
}

async function fetchAllCompletedIssues() {
  const issues = [];
  let cursor = null;
  let page = 1;

  while (true) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const data = await linearQuery(`{
      issues(
        first: 50
        ${afterClause}
        filter: {
          state: { type: { in: ["completed"] } }
          completedAt: { gte: "${SINCE.toISOString()}", lte: "${UNTIL.toISOString()}" }
        }
        orderBy: updatedAt
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          identifier
          title
          startedAt
          completedAt
          team { name }
          assignee { name }
          history(first: 50) {
            nodes {
              createdAt
              toState { name type }
            }
          }
        }
      }
    }`);

    const page_issues = data?.data?.issues?.nodes ?? [];
    issues.push(...page_issues);
    console.log(`Page ${page}: fetched ${page_issues.length} issues (total: ${issues.length})`);

    if (!data?.data?.issues?.pageInfo?.hasNextPage) break;
    cursor = data?.data?.issues?.pageInfo?.endCursor;
    page++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  return issues;
}

async function main() {
  console.log(`Fetching completed Linear issues since ${SINCE.toDateString()}...`);
  const issues = await fetchAllCompletedIssues();
  console.log(`\nTotal issues fetched: ${issues.length}`);

  if (issues.length === 0) {
    console.log("No issues found. Check your Linear API key and filters.");
    return;
  }

  // Build releases payload
  const releases = issues.map(issue => {
    const inReviewEntry = issue.history?.nodes?.find(
      h => h.toState?.name?.toLowerCase().includes("in review")
    );

    return {
      ticketId: issue.identifier,
      title: issue.title,
      project: detectProject(issue),
      ...(issue.startedAt ? { startDate: new Date(issue.startedAt).getTime() } : {}),
      ...(inReviewEntry ? { demoDate: new Date(inReviewEntry.createdAt).getTime() } : {}),
      ...(issue.completedAt ? { releaseDate: new Date(issue.completedAt).getTime() } : {}),
      ...(issue.assignee?.name ? { dri: issue.assignee.name } : {}),
    };
  });

  // Summary
  const withStart = releases.filter(r => r.startDate).length;
  const withDemo = releases.filter(r => r.demoDate).length;
  const withRelease = releases.filter(r => r.releaseDate).length;
  const byProject = {};
  for (const r of releases) byProject[r.project] = (byProject[r.project] || 0) + 1;

  console.log(`\nReady to seed:`);
  console.log(`  ${releases.length} total tickets`);
  console.log(`  ${withStart} have start dates`);
  console.log(`  ${withDemo} have demo dates (In Review)`);
  console.log(`  ${withRelease} have release dates`);
  console.log(`  By project:`, byProject);
  console.log(`\nPosting to ${ENGCAL_URL}/api/add-release...`);

  // Post in batches of 50
  let seeded = 0;
  for (let i = 0; i < releases.length; i += 50) {
    const batch = releases.slice(i, i + 50);
    const res = await fetch(`${ENGCAL_URL}/api/add-release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: ENGCAL_SECRET, releases: batch }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Batch ${i}-${i+50} failed:`, data);
    } else {
      seeded += data.count;
      console.log(`  Seeded ${seeded}/${releases.length}...`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Done! Seeded ${seeded} tickets into engcal.`);
  console.log(`View at: ${ENGCAL_URL}`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
