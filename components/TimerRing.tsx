import React from 'react';

interface TimerRingProps {
  secondsLeft: number;
  totalSeconds: number;
  label: string;
  color?: string;
}

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TimerRing: React.FC<TimerRingProps> = ({
  secondsLeft,
  totalSeconds,
  label,
  color = '#2563eb',
}) => {
  const fraction =
    totalSeconds > 0
      ? Math.max(0, Math.min(1, secondsLeft / totalSeconds))
      : 0;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-6xl font-bold tabular-nums text-slate-800">
          {secondsLeft}
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
};

export default TimerRing;
