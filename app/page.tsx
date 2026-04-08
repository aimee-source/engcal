"use client";

import { useState } from "react";
import { db } from "@/lib/db";

const PROJECT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  web:       { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500" },
  server:    { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500" },
  mobile:    { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  functions: { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500" },
  other:     { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400" },
};

const EVENT_ICONS: Record<string, string> = {
  start:   "🟢",
  demo:    "🟡",
  release: "🔵",
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">engcal</h1>
          <span className="text-sm text-gray-400">Avida Engineering Velocity</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap justify-end">
          {avgCycleDays !== null && (
            <span>⚡ Avg cycle time: <strong className="text-gray-800">{avgCycleDays}d</strong></span>
          )}
          <div className="flex items-center gap-3">
            {Object.entries(PROJECT_COLORS).filter(([k]) => k !== "other").map(([proj, c]) => (
              <span key={proj} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {proj}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{EVENT_ICONS.start} started</span>
            <span>{EVENT_ICONS.demo} demo</span>
            <span>{EVENT_ICONS.release} released</span>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 text-xl">‹</button>
          <h2 className="text-xl font-semibold text-gray-800">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 text-xl">›</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
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

              return (
                <div
                  key={i}
                  className={`min-h-28 p-2 border-b border-r border-gray-100 ${!isCurrentMonth ? "bg-gray-50" : ""}`}
                >
                  {isCurrentMonth && (
                    <>
                      <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? "bg-blue-600 text-white" : "text-gray-700"
                      }`}>
                        {dayNum}
                      </div>
                      <div className="space-y-0.5">
                        {events.map((ev, ei) => {
                          const c = colors(ev.feature.project);
                          return (
                            <button
                              key={ei}
                              onClick={() => setSelected(ev.feature)}
                              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${c.bg} ${c.text} hover:opacity-80`}
                            >
                              <span className="shrink-0">{EVENT_ICONS[ev.type]}</span>
                              <span className="truncate">{ev.feature.title}</span>
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors(selected.project).bg} ${colors(selected.project).text}`}>
                    {selected.project}
                  </span>
                  {selected.ticketId && <span className="text-xs text-gray-400">{selected.ticketId}</span>}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{selected.title}</h3>
                {selected.dri && <p className="text-sm text-gray-500 mt-0.5">DRI: {selected.dri}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
            </div>

            <div className="space-y-2 text-sm">
              {selected.startDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{EVENT_ICONS.start} Started</span>
                  <span className="font-medium text-gray-800">{new Date(selected.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.demoDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{EVENT_ICONS.demo} Demo&apos;d to Product</span>
                  <span className="font-medium text-gray-800">{new Date(selected.demoDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.releaseDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{EVENT_ICONS.release} Released to Production</span>
                  <span className="font-medium text-gray-800">{new Date(selected.releaseDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.startDate && selected.releaseDate && (
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-500">⚡ Cycle time</span>
                  <span className="font-semibold text-gray-900">
                    {Math.round((selected.releaseDate - selected.startDate) / 86400000)}d
                  </span>
                </div>
              )}
            </div>

            {selected.notes && (
              <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{selected.notes}</p>
            )}

            {selected.linearUrl && (
              <a
                href={selected.linearUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-800"
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
