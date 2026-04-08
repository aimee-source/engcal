import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";

// Called by the release bot after a confirmed production deploy
// Body: { secret, releases: [{ ticketId, title, project, linearUrl?, dri? }], releaseDate? }
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.secret !== process.env.ENGCAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const releases: { ticketId: string; title: string; project: string; linearUrl?: string; dri?: string; startDate?: number; demoDate?: number }[] = body.releases ?? [];
  const releaseDate: number = body.releaseDate ?? Date.now();

  if (!Array.isArray(releases) || releases.length === 0) {
    return NextResponse.json({ error: "No releases provided" }, { status: 400 });
  }

  const adminDb = getAdminDb();

  // Check for existing features by ticketId so we can upsert
  const { features: existing } = await adminDb.query({
    features: { $: { where: { ticketId: { in: releases.map(r => r.ticketId) } } } }
  });

  const existingMap = new Map(existing.map(f => [f.ticketId, f.id]));

  const txns = releases.map(r => {
    const featureId = existingMap.get(r.ticketId) ?? id();
    return adminDb.tx.features[featureId].merge({
      ticketId: r.ticketId,
      title: r.title,
      project: r.project,
      releaseDate,
      ...(r.linearUrl ? { linearUrl: r.linearUrl } : {}),
      ...(r.dri ? { dri: r.dri } : {}),
      ...(r.startDate ? { startDate: r.startDate } : {}),
      ...(r.demoDate ? { demoDate: r.demoDate } : {}),
    });
  });

  await adminDb.transact(txns);

  return NextResponse.json({ ok: true, count: releases.length });
}
