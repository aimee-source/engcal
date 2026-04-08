"use client";

import { useState } from "react";
import { db } from "@/lib/db";

const PROJECT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  web:       { bg: "bg-blue-900/60",   text: "text-blue-300",   dot: "bg-blue-400" },
  server:    { bg: "bg-violet-900/60", text: "text-violet-300", dot: "bg-violet-400" },
  mobile:    { bg: "bg-orange-900/60", text: "text-orange-300", dot: "bg-orange-400" },
  functions: { bg: "bg-green-900/60",  text: "text-green-300",  dot: "bg-green-400" },
  other:     { bg: "bg-zinc-800",      text: "text-zinc-300",   dot: "bg-zinc-500" },
};

const EVENT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  start:   { bg: "bg-yellow-500/20", text: "text-black", icon: "🟡" },
  demo:    { bg: "bg-green-500/20",  text: "text-black", icon: "🟢" },
  release: { bg: "bg-blue-500/20",   text: "text-black", icon: "🔵" },
};
const EVENT_ICONS: Record<string, string> = {
  start:   EVENT_COLORS.start.icon,
  demo:    EVENT_COLORS.demo.icon,
  release: EVENT_COLORS.release.icon,
};

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon-start
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

  // Build map: dateKey -> DayEvent[]
  const eventsByDay = new Map<string, DayEvent[]>();
  for (const f of features) {
    const add = (ts: number | undefined, type: DayEvent["type"]) => {
      if (!ts) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!eventsByDay.has(key)) eventsByDay.set(key, []);
      eventsByDay.get(key)!.push({ feature: f, type });
    };
    add(f.startDate, "start");
    add(f.demoDate, "demo");
    add(f.releaseDate, "release");
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
  const today = new Date();

  const withBothDates = features.filter(f => f.startDate && f.releaseDate);
  const avgCycleDays = withBothDates.length > 0
    ? Math.round(withBothDates.reduce((sum, f) => sum + (f.releaseDate! - f.startDate!) / 86400000, 0) / withBothDates.length)
    : null;

  const colors = (project: string) => PROJECT_COLORS[project] ?? PROJECT_COLORS.other;

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
          <div className="flex items-center gap-3">
            {Object.entries(PROJECT_COLORS).filter(([k]) => k !== "other").map(([proj, c]) => (
              <span key={proj} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {proj}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-yellow-300">{EVENT_COLORS.start.icon} started</span>
            <span className="text-green-300">{EVENT_COLORS.demo.icon} demo&apos;d</span>
            <span className="text-blue-300">{EVENT_COLORS.release.icon} released</span>
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
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, i) => {
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
              return (
                <div
                  key={i}
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
                              <span className="shrink-0">{ec.icon}</span>
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
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors(selected.project).bg} ${colors(selected.project).text}`}>
                    {selected.project}
                  </span>
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
                  <span className="text-zinc-400">{EVENT_ICONS.start} Started</span>
                  <span className="font-medium text-white">{new Date(selected.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.demoDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">{EVENT_ICONS.demo} Demo&apos;d to Product</span>
                  <span className="font-medium text-white">{new Date(selected.demoDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.releaseDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">{EVENT_ICONS.release} Released to Production</span>
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
