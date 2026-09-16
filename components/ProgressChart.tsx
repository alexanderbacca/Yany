import React from 'react';
import { SessionEntry } from '../types';

interface ProgressChartProps {
  sessions: SessionEntry[];
}

interface DayData {
  date: Date;
  label: string;
  sessionsCount: number;
  minutes: number;
  isToday: boolean;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 150;
const BAR_AREA_HEIGHT = 90;
const BAR_WIDTH = 28;
const BASELINE_Y = 100;
const LABEL_Y = 122;
const GAP = (CHART_WIDTH - BAR_WIDTH * 7) / 8;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildWeekData(sessions: SessionEntry[]): DayData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: DayData[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const daySessions = sessions.filter((s) => isSameDay(new Date(s.dateISO), date));
    const minutes = Math.round(
      daySessions.reduce((sum, s) => sum + s.durationSec, 0) / 60
    );
    const label = date
      .toLocaleDateString('es-ES', { weekday: 'short' })
      .charAt(0)
      .toUpperCase();

    days.push({
      date,
      label,
      sessionsCount: daySessions.length,
      minutes,
      isToday: i === 0,
    });
  }

  return days;
}

function computeStreak(sessions: SessionEntry[]): number {
  const completedDays = new Set(
    sessions.filter((s) => s.completed).map((s) => new Date(s.dateISO).toDateString())
  );
  let streak = 0;
  const cursor = new Date();
  while (completedDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const StatTile: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-2 text-center">
    <p className="text-lg font-bold text-blue-600">{value}</p>
    <p className="text-[11px] leading-tight text-gray-500">{label}</p>
  </div>
);

const ProgressChart: React.FC<ProgressChartProps> = ({ sessions }) => {
  const days = buildWeekData(sessions);
  const sessionsThisWeek = days.reduce((sum, d) => sum + d.sessionsCount, 0);
  const minutesThisWeek = days.reduce((sum, d) => sum + d.minutes, 0);
  const streak = computeStreak(sessions);
  const maxMinutes = Math.max(1, ...days.map((d) => d.minutes));

  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile label="Sesiones esta semana" value={sessionsThisWeek} />
        <StatTile label="Minutos esta semana" value={minutesThisWeek} />
        <StatTile label="Racha actual" value={streak} />
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Minutos de ejercicio en los últimos 7 días"
      >
        {days.map((day, i) => {
          const x = GAP + i * (BAR_WIDTH + GAP);
          const barHeight =
            day.minutes > 0 ? Math.max(6, (day.minutes / maxMinutes) * BAR_AREA_HEIGHT) : 4;
          const y = BASELINE_Y - barHeight;
          const fill = day.isToday ? '#06b6d4' : day.minutes > 0 ? '#2563eb' : '#e2e8f0';

          return (
            <g key={day.date.toISOString()}>
              <rect x={x} y={y} width={BAR_WIDTH} height={barHeight} rx={4} fill={fill} />
              <text
                x={x + BAR_WIDTH / 2}
                y={LABEL_Y}
                textAnchor="middle"
                className={
                  day.isToday
                    ? 'fill-cyan-600 text-[11px] font-bold'
                    : 'fill-slate-400 text-[11px] font-medium'
                }
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ProgressChart;
