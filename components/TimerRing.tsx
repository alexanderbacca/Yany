import React from 'react';

interface TimerRingProps {
  secondsLeft: number;
  totalSeconds: number;
  label: string;
  color: string;
}

const TimerRing: React.FC<TimerRingProps> = ({
  secondsLeft,
  totalSeconds,
  label,
  color,
}) => {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-800">
            {secondsLeft}
          </span>
        </div>
      </div>
      <p className="mt-4 text-lg font-medium text-gray-700">{label}</p>
    </div>
  );
};

export default TimerRing;
