import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type IssueData = {
  id?: string;
  identifier: string;
  title: string;
  description?: string;
  startedAt?: string;
  completedAt?: string;
  team?: { name: string };
  assignee?: { name: string };
  state?: { name: string; type: string };
  labels?: { nodes: { id: string; name: string }[] };
};

async function fetchFullIssue(identifier: string): Promise<IssueData | null> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return null;
  const number = parseInt(identifier.split("-")[1]);
  if (!number) return null;
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": apiKey },
    body: JSON.stringify({
      query: `{
        issues(filter: { number: { eq: ${number} } }, first: 1) {
          nodes {
            id identifier title description startedAt completedAt
            team { name }
            assignee { name }
            state { name type }
            labels { nodes { id name } }
          }
        }
      }`
    }),
  });
  const data = await res.json();
  return data?.data?.issues?.nodes?.[0] ?? null;
}

async function classifyAsFeature(title: string, description?: string): Promise<boolean> {
  const prompt = `Is this a user-facing feature or meaningful product improvement (not a bug fix, refactor, script, or internal tooling)?

Title: ${title}${description ? `\nDescription: ${description.slice(0, 300)}` : ""}

Reply with only "yes" or "no".`;

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 5,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text.toLowerCase().trim() : "no";
  return text.startsWith("yes");
}

async function addFeatureLabel(issueId: string, currentLabelIds: string[]): Promise<void> {
  const featureLabelId = process.env.LINEAR_FEATURE_LABEL_ID;
  if (!featureLabelId || !issueId) return;
  const allLabelIds = [...new Set([...currentLabelIds, featureLabelId])];
  await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": process.env.LINEAR_API_KEY! },
    body: JSON.stringify({
      query: `mutation { issueUpdate(id: "${issueId}", input: { labelIds: ${JSON.stringify(allLabelIds)} }) { success } }`
    }),
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (secret) {
    const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (hmac !== request.headers.get("linear-signature")) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: {
    type: string;
    action: string;
    data: IssueData;
    updatedFrom?: { labelIds?: string[] };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "Issue" || !["create", "update"].includes(payload.action)) {
    return NextResponse.json({ ok: true });
  }

  let issue = payload.data;
  if (!issue.identifier) return NextResponse.json({ ok: true });

  const stateType = issue.state?.type ?? "";

  // Only care about started, inReview, or completed states
  if (!["started", "inReview", "completed"].includes(stateType)) {
    return NextResponse.json({ ok: true });
  }

  const hasFeatureLabel = issue.labels?.nodes?.some(
    l => l.name.toLowerCase() === "feature"
  );

  // If no Feature label, ask Claude to classify
  if (!hasFeatureLabel) {
    const isFeature = await classifyAsFeature(issue.title, issue.description);
    if (!isFeature) return NextResponse.json({ ok: true });

    // Add Feature label in Linear
    const full = await fetchFullIssue(issue.identifier);
    if (full) issue = full;
    const currentLabelIds = issue.labels?.nodes?.map(l => l.id) ?? [];
    if (issue.id) await addFeatureLabel(issue.id, currentLabelIds);
  }

  // Always fetch full issue to ensure accurate timestamps
  const full = await fetchFullIssue(issue.identifier);
  if (full) issue = full;

  const adminDb = getAdminDb();
  const { features: existing } = await adminDb.query({
    features: { $: { where: { ticketId: issue.identifier } } }
  });
  const featureId = existing[0]?.id ?? id();

  const teamName = (issue.team?.name ?? "").toLowerCase();
  const project = teamName.includes("mobile") || teamName.includes("react-native") ? "mobile"
    : teamName.includes("server") || teamName.includes("backend") || teamName.includes("function") ? "functions"
    : "web";

  const update: Record<string, unknown> = {
    ticketId: issue.identifier,
    title: issue.title,
    project,
    ...(issue.assignee?.name ? { dri: issue.assignee.name } : {}),
  };

  const stateName = (issue.state?.name ?? "").toLowerCase();

  if (issue.startedAt) {
    update.startDate = new Date(issue.startedAt).getTime();
  }
  if (stateName.includes("in review")) {
    update.demoDate = issue.startedAt ? new Date(issue.startedAt).getTime() : Date.now();
  }
  if (stateType === "completed") {
    if (issue.completedAt) update.releaseDate = new Date(issue.completedAt).getTime();
    if (!existing[0]?.demoDate && issue.startedAt) {
      update.demoDate = new Date(issue.startedAt).getTime();
    }
  }

  await adminDb.transact([adminDb.tx.features[featureId].merge(update)]);

  return NextResponse.json({ ok: true });
}
