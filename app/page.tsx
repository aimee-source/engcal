"use client";

import { useState } from "react";
import { db } from "@/lib/db";

const BAR_H = 22; // px per bar row

type Feature = {
  id: string;
  ticketId: string;
  title: string;
  project: string;
  dri?: string;
  startDate?: number;
  demoDate?: number;
  releaseDate?: number;
  linearUrl?: string;
  notes?: string;
};

type WeekBar = {
  feature: Feature;
  barType: "release" | "demo";
  colStart: number;
  colEnd: number;
  row: number;
  clippedLeft: boolean;
  clippedRight: boolean;
};

type WeekRow = { days: (number | null)[]; weekMonday: Date };

function getWeekRows(year: number, month: number): WeekRow[] {
  const firstOfMonth = new Date(year, month, 1);
  const dow = firstOfMonth.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const daysBack = dow === 0 ? 6 : dow - 1; // days back to Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastOfMonth = new Date(year, month, daysInMonth);
  const rows: WeekRow[] = [];
  const cur = new Date(year, month, 1 - daysBack);
  while (cur <= lastOfMonth) {
    const days: (number | null)[] = [];
    for (let d = 0; d < 5; d++) {
      const date = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + d);
      days.push(date.getMonth() === month ? date.getDate() : null);
    }
    rows.push({ days, weekMonday: new Date(cur) });
    cur.setDate(cur.getDate() + 7);
  }
  return rows;
}

function assignBarRows(bars: Omit<WeekBar, "row">[]): WeekBar[] {
  const rowEnds: number[] = [];
  return bars.map(bar => {
    let row = rowEnds.findIndex(end => end < bar.colStart);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(bar.colEnd);
    } else {
      rowEnds[row] = bar.colEnd;
    }
    return { ...bar, row };
  });
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri"];

export default function Home() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Feature | null>(null);

  const { data } = db.useQuery({ features: {} });
  const features: Feature[] = (data?.features ?? []) as Feature[];

  // dateKey -> events for day-cell indicators
  const eventsByDay = new Map<string, { feature: Feature; type: "demo" | "release" }[]>();
  for (const f of features) {
    const [ts, type] = f.releaseDate
      ? [f.releaseDate, "release" as const]
      : f.demoDate
      ? [f.demoDate, "demo" as const]
      : [undefined, undefined];
    if (!ts || !type) continue;
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push({ feature: f, type });
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const today = new Date();
  const weekRows = getWeekRows(year, month);

  const withBothDates = features.filter(f => f.startDate && f.releaseDate);
  const avgCycleDays = withBothDates.length > 0
    ? Math.round(withBothDates.reduce((sum, f) => sum + (f.releaseDate! - f.startDate!) / 86400000, 0) / withBothDates.length)
    : null;

  // Pre-compute bars per week (Mon–Fri only)
  const weekBars: WeekBar[][] = weekRows.map(({ weekMonday }) => {
    const weekStartDate = new Date(weekMonday);
    weekStartDate.setHours(0, 0, 0, 0);
    const weekEndDate = new Date(weekMonday);
    weekEndDate.setDate(weekMonday.getDate() + 4); // Friday
    weekEndDate.setHours(23, 59, 59, 999);
    const weekStartMs = weekStartDate.getTime();
    const weekEndMs = weekEndDate.getTime();

    const rawBars: Omit<WeekBar, "row">[] = [];
    for (const f of features) {
      const barStartMs = f.startDate ?? f.demoDate ?? f.releaseDate;
      const barEndMs = f.releaseDate ?? f.demoDate ?? f.startDate;
      if (!barStartMs || !barEndMs) continue;

      const barType: "release" | "demo" = f.releaseDate ? "release" : f.demoDate ? "demo" : null!;
      if (!barType) continue;

      const clampedStart = Math.max(barStartMs, weekStartMs);
      const clampedEnd = Math.min(barEndMs, weekEndMs);
      if (clampedStart > clampedEnd) continue;

      const colStart = Math.min(4, Math.max(0, Math.floor((clampedStart - weekStartMs) / 86400000)));
      const colEnd   = Math.min(4, Math.max(0, Math.floor((clampedEnd   - weekStartMs) / 86400000)));

      rawBars.push({
        feature: f,
        barType,
        colStart,
        colEnd,
        clippedLeft:  barStartMs < weekStartMs,
        clippedRight: barEndMs   > weekEndMs,
      });
    }

    rawBars.sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart));
    return assignBarRows(rawBars);
  });

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">engcal</h1>
          <span className="text-sm text-zinc-500">Avida Engineering Velocity</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-400 flex-wrap justify-end">
          {avgCycleDays !== null && (
            <span>⚡ Avg cycle time: <strong className="text-white">{avgCycleDays}d</strong></span>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-300">🟢 demo</span>
            <span className="text-blue-300">🔵 launch</span>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 text-xl">‹</button>
          <h2 className="text-xl font-semibold text-white">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 text-xl">›</button>
        </div>

        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-5 border-b border-zinc-800">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {weekRows.map(({ days, weekMonday }, w) => {
            const bars = weekBars[w];
            const maxRow = bars.length > 0 ? Math.max(...bars.map(b => b.row)) + 1 : 0;
            const barAreaHeight = maxRow * BAR_H;

            // Weekly release count (Mon–Fri of this week)
            const weekStartMs = weekMonday.getTime();
            const weekEndMs = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + 4, 23, 59, 59).getTime();
            const weekReleaseCount = features.filter(f => f.releaseDate && f.releaseDate >= weekStartMs && f.releaseDate <= weekEndMs).length;
            const weekGoalMet = weekReleaseCount >= 5;

            return (
              <div key={w}>
                {/* Multi-day bar area */}
                {barAreaHeight > 0 && (
                  <div
                    className="relative border-b border-zinc-800/40 bg-zinc-950"
                    style={{ height: barAreaHeight }}
                  >
                    <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
                      {Array.from({ length: 5 }).map((_, d) => (
                        <div key={d} className={d < 4 ? "border-r border-zinc-800/40" : ""} />
                      ))}
                    </div>
                    {bars.map((bar, bi) => {
                      const leftPct  = (bar.colStart / 5) * 100;
                      const widthPct = ((bar.colEnd - bar.colStart + 1) / 5) * 100;
                      const colorClass = bar.barType === "release"
                        ? "bg-blue-500 text-white"
                        : "bg-green-500 text-white";
                      const rLeft  = bar.clippedLeft  ? "0" : "3px";
                      const rRight = bar.clippedRight ? "0" : "3px";
                      return (
                        <button
                          key={bi}
                          onClick={() => setSelected(bar.feature)}
                          title={bar.feature.title}
                          className={`absolute flex items-center text-xs px-1.5 truncate ${colorClass} hover:opacity-80 overflow-hidden`}
                          style={{
                            top:    bar.row * BAR_H + 3,
                            height: BAR_H - 6,
                            left:  `calc(${leftPct}%  + ${bar.clippedLeft  ? 0 : 2}px)`,
                            width: `calc(${widthPct}% - ${(bar.clippedLeft ? 0 : 2) + (bar.clippedRight ? 0 : 2)}px)`,
                            borderRadius: `${rLeft} ${rRight} ${rRight} ${rLeft}`,
                          }}
                        >
                          {!bar.clippedLeft && <span className="truncate">{bar.feature.title}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Day cells */}
                <div className="grid grid-cols-5">
                  {days.map((dayNum, d) => {
                    const isCurrentMonth = dayNum !== null;
                    const isToday = isCurrentMonth &&
                      today.getFullYear() === year &&
                      today.getMonth() === month &&
                      today.getDate() === dayNum;
                    const isFriday = d === 4;
                    const dateKey = isCurrentMonth
                      ? `${year}-${String(month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`
                      : "";
                    const events = dateKey ? (eventsByDay.get(dateKey) ?? []) : [];

                    return (
                      <div
                        key={d}
                        className={`min-h-28 p-2 border-b border-r border-zinc-800 ${
                          !isCurrentMonth ? "bg-zinc-900/30" : ""
                        }`}
                      >
                        {isCurrentMonth && (
                          <>
                            <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                              isToday ? "bg-blue-600 text-white" : "text-zinc-400"
                            }`}>
                              {dayNum}
                            </div>
                            <div className="space-y-0.5">
                              {events.map((ev, ei) => (
                                <button
                                  key={ei}
                                  onClick={() => setSelected(ev.feature)}
                                  className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 hover:opacity-80 ${
                                    ev.type === "release" ? "bg-blue-500/20 text-blue-200" : "bg-green-500/20 text-green-200"
                                  }`}
                                >
                                  <span className="truncate flex-1">{ev.feature.title}</span>
                                  {ev.feature.dri && (
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold">
                                      {ev.feature.dri.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                            {isFriday && (
                              <div className="mt-2 flex items-center justify-end gap-1 text-xs text-zinc-400">
                                <span>{weekGoalMet ? "✅" : "⬜"}</span>
                                <span>{weekReleaseCount}/5 released</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selected.ticketId && (
                    <a
                      href={selected.linearUrl ?? `https://linear.app/issue/${selected.ticketId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-blue-400 hover:underline transition-colors"
                    >
                      {selected.ticketId}
                    </a>
                  )}
                </div>
                <h3 className="text-base font-semibold text-white">{selected.title}</h3>
                {selected.dri && <p className="text-sm text-zinc-400 mt-0.5">DRI: {selected.dri}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-xl leading-none ml-4">×</button>
            </div>

            <div className="space-y-2 text-sm">
              {selected.startDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">🟡 Started</span>
                  <span className="font-medium text-white">{new Date(selected.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.demoDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">🟢 Demo</span>
                  <span className="font-medium text-white">{new Date(selected.demoDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.releaseDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">🔵 Production Launch</span>
                  <span className="font-medium text-white">{new Date(selected.releaseDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.startDate && selected.releaseDate && (
                <div className="flex justify-between pt-2 border-t border-zinc-700">
                  <span className="text-zinc-400">⚡ Cycle time</span>
                  <span className="font-semibold text-white">
                    {Math.round((selected.releaseDate - selected.startDate) / 86400000)}d
                  </span>
                </div>
              )}
            </div>

            {selected.notes && (
              <p className="mt-3 text-sm text-zinc-400 bg-zinc-800 rounded-lg p-3">{selected.notes}</p>
            )}

            {selected.linearUrl && (
              <a
                href={selected.linearUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center text-sm text-blue-400 hover:text-blue-300"
              >
                View in Linear →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
