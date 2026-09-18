import React from "react";

interface TimerRingProps {
  timeRemaining: number;
  totalTime: number;
  label: string;
  isRest?: boolean;
}

export function TimerRing({ timeRemaining, totalTime, label, isRest = false }: TimerRingProps) {
  const progress = timeRemaining / totalTime;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isRest ? "#f59e0b" : "#10b981"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-800">{timeRemaining}</span>
        </div>
      </div>
      <p className="mt-4 text-lg font-medium text-gray-700">{label}</p>
      {isRest && (
        <p className="mt-1 text-sm text-amber-600">Tiempo de descanso</p>
      )}
    </div>
  );
}
