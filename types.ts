export enum AppState {
  START = 'START',
  WARMUP = 'WARMUP',
  CIRCUIT = 'CIRCUIT',
  COOLDOWN = 'COOLDOWN',
  SUMMARY = 'SUMMARY',
  HISTORY = 'HISTORY',
}

export type StepKind = 'warmup' | 'main' | 'cooldown';

export interface ExerciseStep {
  id: string;
  name: string;
  description: string;
  target: string;
  durationSec: number;
  kind: StepKind;
  imageUrl: string;
}

export interface SessionEntry {
  dateISO: string;
  durationSec: number;
  completed: boolean;
  exercisesDone: number;
}
