import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import * as crypto from "crypto";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Linear webhook signature
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("linear-delivery") ?? "";
    const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (hmac !== request.headers.get("linear-signature")) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: {
    type: string;
    action: string;
    data: {
      identifier: string;
      title: string;
      startedAt?: string;
      completedAt?: string;
      team?: { name: string };
      assignee?: { name: string };
      state?: { name: string; type: string };
      labels?: { nodes: { name: string }[] };
    };
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

  const issue = payload.data;
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

  if (stateType === "started" && issue.startedAt) {
    update.startDate = new Date(issue.startedAt).getTime();
  }
  if (stateName.includes("in review") && issue.startedAt) {
    // Use startedAt as proxy if no explicit demoDate; will be overwritten by actual demo date
    update.demoDate = Date.now();
  }
  if (stateType === "completed" && issue.completedAt) {
    update.releaseDate = new Date(issue.completedAt).getTime();
  }

  await adminDb.transact([adminDb.tx.features[featureId].merge(update)]);

  return NextResponse.json({ ok: true });
}
