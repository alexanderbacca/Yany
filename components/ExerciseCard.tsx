import React, { useState } from 'react';
import { ExerciseStep } from '../types';
import { REST_SEC } from '../constants';
import TimerRing from './TimerRing';

interface ExerciseCardProps {
  step: ExerciseStep;
  secondsLeft: number;
  phaseLabel: string;
  phaseColor: string;
  isRest: boolean;
  nextStep?: ExerciseStep | null;
  onSkip: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  step,
  secondsLeft,
  phaseLabel,
  phaseColor,
  isRest,
  nextStep,
  onSkip,
}) => {
  const [imgErrorFor, setImgErrorFor] = useState<string | null>(null);
  const showPlaceholder = imgErrorFor === step.id;
  const totalSeconds = isRest ? REST_SEC : step.durationSec;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="aspect-video overflow-hidden rounded-2xl bg-white shadow-sm">
        {showPlaceholder ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-100 to-blue-200">
            <span className="text-5xl">🏋️‍♀️</span>
            <span className="px-4 text-center font-medium text-slate-600">
              {step.name}
            </span>
          </div>
        ) : (
          <img
            src={step.imageUrl}
            alt={step.name}
            className="h-full w-full object-cover"
            onError={() => setImgErrorFor(step.id)}
          />
        )}
      </div>

      {isRest ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-center shadow-sm">
          <p className="text-2xl font-bold text-cyan-700">Descanso</p>
          {nextStep && (
            <p className="mt-1 text-slate-600">
              Siguiente: {nextStep.name}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800">{step.name}</h2>
          <p className="mt-2 text-slate-600">{step.description}</p>
          <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
            {step.target}
          </span>
        </div>
      )}

      <TimerRing
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        label={phaseLabel}
        color={phaseColor}
      />

      <button
        onClick={onSkip}
        className="w-full rounded-xl border border-blue-300 py-3 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
      >
        Saltar ›
      </button>
    </div>
  );
};

export default ExerciseCard;
