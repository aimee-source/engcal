"use client";

import { useState } from "react";
import { db } from "@/lib/db";


const EVENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  demo:    { bg: "bg-green-500/20",  text: "text-black", label: "Demo" },
  release: { bg: "bg-blue-500/20",   text: "text-black", label: "Launch" },
};

const BAR_COLORS: Record<string, string> = {
  release: "bg-blue-500 text-white",
  demo:    "bg-green-500 text-white",
  start:   "bg-amber-500/70 text-white",
};

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

type DayEvent = {
  feature: Feature;
  type: "start" | "demo" | "release";
};

type WeekBar = {
  feature: Feature;
  barType: "release" | "demo" | "start";
  colStart: number;
  colEnd: number;
  row: number;
  clippedLeft: boolean;
  clippedRight: boolean;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon-start
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
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function Home() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Feature | null>(null);

  const { data } = db.useQuery({ features: {} });
  const features: Feature[] = (data?.features ?? []) as Feature[];

  // Build map: dateKey -> DayEvent[] — only demo and release events
  const eventsByDay = new Map<string, DayEvent[]>();
  for (const f of features) {
    const [ts, type]: [number | undefined, DayEvent["type"]] = f.releaseDate
      ? [f.releaseDate, "release"]
      : f.demoDate
      ? [f.demoDate, "demo"]
      : [undefined, "start"];
    if (!ts) continue; // skip started-only tickets
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

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const numWeeks = totalCells / 7;
  const today = new Date();

  const withBothDates = features.filter(f => f.startDate && f.releaseDate);
  const avgCycleDays = withBothDates.length > 0
    ? Math.round(withBothDates.reduce((sum, f) => sum + (f.releaseDate! - f.startDate!) / 86400000, 0) / withBothDates.length)
    : null;

  // Pre-compute bars per week
  const weekBars: WeekBar[][] = Array.from({ length: numWeeks }, (_, w) => {
    const weekStartDate = new Date(year, month, w * 7 - firstDay + 1);
    weekStartDate.setHours(0, 0, 0, 0);
    const weekEndDate = new Date(year, month, w * 7 - firstDay + 7);
    weekEndDate.setHours(23, 59, 59, 999);
    const weekStartMs = weekStartDate.getTime();
    const weekEndMs = weekEndDate.getTime();

    const rawBars: Omit<WeekBar, "row">[] = [];
    for (const f of features) {
      const barStartMs = f.startDate ?? f.demoDate ?? f.releaseDate;
      const barEndMs = f.releaseDate ?? f.demoDate ?? f.startDate;
      if (!barStartMs || !barEndMs) continue;

      const clampedStart = Math.max(barStartMs, weekStartMs);
      const clampedEnd = Math.min(barEndMs, weekEndMs);
      if (clampedStart > clampedEnd) continue;

      const colStart = Math.min(6, Math.max(0, Math.round((clampedStart - weekStartMs) / 86400000)));
      const colEnd = Math.min(6, Math.max(0, Math.round((clampedEnd - weekStartMs) / 86400000)));

      const barType: "release" | "demo" | "start" = f.releaseDate ? "release" : f.demoDate ? "demo" : "start";

      rawBars.push({
        feature: f,
        barType,
        colStart,
        colEnd,
        clippedLeft: barStartMs < weekStartMs,
        clippedRight: barEndMs > weekEndMs,
      });
    }

    // Sort by start col, then longer bars first for better row packing
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
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {Array.from({ length: numWeeks }).map((_, w) => {
            const bars = weekBars[w];
            const maxRow = bars.length > 0 ? Math.max(...bars.map(b => b.row)) + 1 : 0;
            const barAreaHeight = maxRow * BAR_H;

            return (
              <div key={w}>
                {/* Multi-day bar area */}
                {barAreaHeight > 0 && (
                  <div
                    className="relative border-b border-zinc-800/40 bg-zinc-950"
                    style={{ height: barAreaHeight }}
                  >
                    {/* Column grid lines */}
                    <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                      {Array.from({ length: 7 }).map((_, d) => (
                        <div key={d} className={d < 6 ? "border-r border-zinc-800/40" : ""} />
                      ))}
                    </div>
                    {bars.map((bar, bi) => {
                      const leftPct = (bar.colStart / 7) * 100;
                      const widthPct = ((bar.colEnd - bar.colStart + 1) / 7) * 100;
                      const colorClass = BAR_COLORS[bar.barType];
                      const rLeft = bar.clippedLeft ? "0" : "3px";
                      const rRight = bar.clippedRight ? "0" : "3px";
                      return (
                        <button
                          key={bi}
                          onClick={() => setSelected(bar.feature)}
                          title={bar.feature.title}
                          className={`absolute flex items-center text-xs px-1.5 truncate ${colorClass} hover:opacity-80 overflow-hidden`}
                          style={{
                            top: bar.row * BAR_H + 3,
                            height: BAR_H - 6,
                            left: `calc(${leftPct}% + ${bar.clippedLeft ? 0 : 2}px)`,
                            width: `calc(${widthPct}% - ${(bar.clippedLeft ? 0 : 2) + (bar.clippedRight ? 0 : 2)}px)`,
                            borderRadius: `${rLeft} ${rRight} ${rRight} ${rLeft}`,
                          }}
                        >
                          {!bar.clippedLeft && (
                            <span className="truncate">{bar.feature.title}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const i = w * 7 + d;
                    const dayNum = i - firstDay + 1;
                    const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                    const isToday = isCurrentMonth &&
                      today.getFullYear() === year &&
                      today.getMonth() === month &&
                      today.getDate() === dayNum;
                    const dateKey = isCurrentMonth
                      ? `${year}-${String(month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`
                      : "";
                    const events = dateKey ? (eventsByDay.get(dateKey) ?? []) : [];

                    const hasEvents = events.length > 0;
                    const isSunday = d === 6;
                    const weekReleaseCount = isSunday && isCurrentMonth ? features.filter(f => {
                      if (!f.releaseDate) return false;
                      const weekStart = new Date(year, month, dayNum - 6).getTime();
                      const weekEnd = new Date(year, month, dayNum, 23, 59, 59).getTime();
                      return f.releaseDate >= weekStart && f.releaseDate <= weekEnd;
                    }).length : 0;
                    const weekGoalMet = weekReleaseCount >= 5;

                    return (
                      <div
                        key={d}
                        className={`min-h-28 p-2 border-b border-r border-zinc-800 ${
                          !isCurrentMonth ? "bg-zinc-900/30" :
                          hasEvents ? "bg-[#c8f5e4]" : ""
                        }`}
                      >
                        {isCurrentMonth && (
                          <>
                            <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                              isToday ? "bg-blue-600 text-white" : hasEvents ? "text-black" : "text-zinc-400"
                            }`}>
                              {dayNum}
                            </div>
                            <div className="space-y-0.5">
                              {events.map((ev, ei) => {
                                const ec = EVENT_COLORS[ev.type];
                                return (
                                  <button
                                    key={ei}
                                    onClick={() => setSelected(ev.feature)}
                                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${ec.bg} ${ec.text} hover:opacity-80`}
                                  >
                                    <span className="truncate flex-1">{ev.feature.title}</span>
                                    {ev.feature.dri && (
                                      <span className="shrink-0 w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-semibold">
                                        {ev.feature.dri.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {isSunday && (
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
