import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import * as crypto from "crypto";

type IssueData = {
  identifier: string;
  title: string;
  startedAt?: string;
  completedAt?: string;
  team?: { name: string };
  assignee?: { name: string };
  state?: { name: string; type: string };
  labels?: { nodes: { name: string }[] };
};

async function fetchFullIssue(identifier: string): Promise<IssueData | null> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": apiKey },
    body: JSON.stringify({
      query: `{
        issues(filter: { identifier: { eq: "${identifier}" } }, first: 1) {
          nodes {
            identifier title startedAt completedAt
            team { name }
            assignee { name }
            state { name type }
            labels { nodes { name } }
          }
        }
      }`
    }),
  });
  const data = await res.json();
  return data?.data?.issues?.nodes?.[0] ?? null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Linear webhook signature
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

  // Only handle Issue events
  if (payload.type !== "Issue" || !["create", "update"].includes(payload.action)) {
    return NextResponse.json({ ok: true });
  }

  let issue = payload.data;
  if (!issue.identifier) return NextResponse.json({ ok: true });

  // Only track issues with the "feature" label
  const hasFeatureLabel = issue.labels?.nodes?.some(
    l => l.name.toLowerCase() === "feature"
  );
  if (!hasFeatureLabel) return NextResponse.json({ ok: true });

  const stateType = issue.state?.type ?? "";
  const stateName = (issue.state?.name ?? "").toLowerCase();

  // Only care about started, inReview, or completed states
  if (!["started", "inReview", "completed"].includes(stateType)) {
    return NextResponse.json({ ok: true });
  }

  // Always fetch full issue from Linear to ensure we have all timestamps
  // (webhook payloads can omit completedAt/startedAt on label-change events)
  const full = await fetchFullIssue(issue.identifier);
  if (full) issue = full;

  const adminDb = getAdminDb();
  const { features: existing } = await adminDb.query({
    features: { $: { where: { ticketId: issue.identifier } } }
  });
  const featureId = existing[0]?.id ?? id();

  // Detect project from team name
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

  if (issue.startedAt) {
    update.startDate = new Date(issue.startedAt).getTime();
  }
  if (stateName.includes("in review")) {
    update.demoDate = issue.startedAt ? new Date(issue.startedAt).getTime() : Date.now();
  }
  if (stateType === "completed") {
    // For completed tickets: set releaseDate, and set demoDate from startedAt if not already stored
    if (issue.completedAt) update.releaseDate = new Date(issue.completedAt).getTime();
    if (!existing[0]?.demoDate && issue.startedAt) {
      update.demoDate = new Date(issue.startedAt).getTime();
    }
  }

  await adminDb.transact([adminDb.tx.features[featureId].merge(update)]);

  return NextResponse.json({ ok: true });
}
