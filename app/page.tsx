"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";

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

type Milestone = {
  feature: Feature;
  type: "demo" | "release";
};

type WeekRow = { days: (number | null)[]; weekMonday: Date };

function getWeekRows(year: number, month: number): WeekRow[] {
  const firstOfMonth = new Date(year, month, 1);
  const dow = firstOfMonth.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri"];

export default function Home() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState<Feature | null>(null);
  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => { setToday(new Date()); }, []);

  const { data } = db.useQuery({ features: {} });
  const features: Feature[] = (data?.features ?? []) as Feature[];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const withBothDates = features.filter(f => f.demoDate && f.releaseDate);
  const avgCycleDays = withBothDates.length > 0
    ? Math.round(withBothDates.reduce((sum, f) => sum + (f.releaseDate! - f.demoDate!) / 86400000, 0) / withBothDates.length)
    : null;

  // Build milestone map: key = "year-month-date"
  const milestoneMap = new Map<string, Milestone[]>();
  for (const f of features) {
    if (f.demoDate) {
      const d = new Date(f.demoDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!milestoneMap.has(key)) milestoneMap.set(key, []);
      milestoneMap.get(key)!.push({ feature: f, type: "demo" });
    }
    if (f.releaseDate) {
      const d = new Date(f.releaseDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!milestoneMap.has(key)) milestoneMap.set(key, []);
      milestoneMap.get(key)!.push({ feature: f, type: "release" });
    }
  }

  const weekRows = getWeekRows(year, month);

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
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Demo</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Release</span>
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
            const weekStartMs = weekMonday.getTime();
            const weekEndMs = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + 4, 23, 59, 59).getTime();
            const weekReleaseCount = features.filter(f => f.releaseDate && f.releaseDate >= weekStartMs && f.releaseDate <= weekEndMs).length;
            const weekGoalMet = weekReleaseCount >= 5;
            const isCurrentWeek = today.getTime() >= weekStartMs && today.getTime() <= weekEndMs;

            return (
              <div key={w} className="grid grid-cols-5 border-b border-zinc-800">
                {days.map((dayNum, d) => {
                  const isCurrentMonth = dayNum !== null;
                  const isToday = isCurrentMonth && today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;
                  const isFriday = d === 4;
                  const milestones = isCurrentMonth
                    ? (milestoneMap.get(`${year}-${month}-${dayNum}`) ?? [])
                    : [];

                  return (
                    <div
                      key={d}
                      className={`min-h-24 px-2 pt-2 pb-2 border-r border-zinc-800 ${!isCurrentMonth ? "bg-zinc-900/30" : isCurrentWeek ? "bg-zinc-800/40" : ""}`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-blue-600 text-white" : "text-zinc-400"}`}>
                            {dayNum}
                          </div>
                          <div className="flex flex-col gap-1">
                            {milestones.map((m, i) => (
                              <button
                                key={i}
                                onClick={() => setSelected(m.feature)}
                                title={`${m.type === "demo" ? "Demo" : "Release"}: ${m.feature.title}`}
                                className={`w-full text-left truncate text-xs px-1.5 py-0.5 rounded flex items-center gap-1 hover:opacity-80 ${m.type === "release" ? "bg-blue-500 text-white" : "bg-green-500 text-black"}`}
                              >
                                <span className="truncate flex-1">{m.feature.title}</span>
                                {m.feature.dri && (
                                  <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold ${m.type === "release" ? "bg-white/20" : "bg-black/20"}`}>
                                    {m.feature.dri.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                          {isFriday && (
                            <div className="flex items-center justify-end gap-1 text-xs text-zinc-400 mt-1">
                              <span>{weekGoalMet ? "✅" : "⬜"}</span>
                              <span>{weekReleaseCount}/5</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
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
                    <a href={selected.linearUrl ?? `https://linear.app/issue/${selected.ticketId}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-blue-400 hover:underline transition-colors">
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
              {selected.demoDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">🟢 Demo</span>
                  <span className="font-medium text-white">{new Date(selected.demoDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.releaseDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">🔵 Release</span>
                  <span className="font-medium text-white">{new Date(selected.releaseDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.demoDate && selected.releaseDate && (
                <div className="flex justify-between pt-2 border-t border-zinc-700">
                  <span className="text-zinc-400">⚡ Demo → Release</span>
                  <span className="font-semibold text-white">{Math.round((selected.releaseDate - selected.demoDate) / 86400000)}d</span>
                </div>
              )}
            </div>

            {selected.notes && <p className="mt-3 text-sm text-zinc-400 bg-zinc-800 rounded-lg p-3">{selected.notes}</p>}

            {selected.linearUrl && (
              <a href={selected.linearUrl} target="_blank" rel="noopener noreferrer"
                className="mt-4 block text-center text-sm text-blue-400 hover:text-blue-300">
                View in Linear →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
