import React, { useEffect, useRef, useState } from 'react';
import { AppState, ExerciseStep, SessionEntry } from './types';
import { WARMUP_STEPS, CIRCUIT_STEPS, COOLDOWN_STEPS, REST_SEC, STORAGE_KEY_SESSIONS } from './constants';
import { AudioService } from './services/audio';
import ExerciseCard from './components/ExerciseCard';
import ProgressChart from './components/ProgressChart';
import { useWakeLock } from './hooks/useWakeLock';

type RunnerPhase = AppState.WARMUP | AppState.CIRCUIT | AppState.COOLDOWN;
interface QueueEntry { step: ExerciseStep | null; seconds: number; isRest: boolean; afterRest?: ExerciseStep; phase: RunnerPhase; phaseIndex: number; phaseTotal: number; side?: 'first' | 'second'; }
interface SummaryStats { totalSec: number; exercisesDone: number; streak: number; partial: boolean; }
const PHASE_LABEL: Record<RunnerPhase, string> = { [AppState.WARMUP]: 'Calentamiento', [AppState.CIRCUIT]: 'Circuito', [AppState.COOLDOWN]: 'Enfriamiento' };
const PHASE_SPANISH_KEY: Record<RunnerPhase, 'calentamiento' | 'circuito' | 'enfriamiento'> = { [AppState.WARMUP]: 'calentamiento', [AppState.CIRCUIT]: 'circuito', [AppState.COOLDOWN]: 'enfriamiento' };
const WORK_COLOR = '#2563eb';
const REST_COLOR = '#06b6d4';
const BILATERAL_COOLDOWN_IDS = new Set([
  'estiramiento-cuadriceps',
  'estiramiento-isquiotibiales',
  'estiramiento-lateral',
]);

function buildQueue(): QueueEntry[] {
  const queue: QueueEntry[] = [];
  WARMUP_STEPS.forEach((step, i) => queue.push({ step, seconds: step.durationSec, isRest: false, phase: AppState.WARMUP, phaseIndex: i + 1, phaseTotal: WARMUP_STEPS.length }));
  CIRCUIT_STEPS.forEach((step, i) => {
    queue.push({ step, seconds: step.durationSec, isRest: false, phase: AppState.CIRCUIT, phaseIndex: i + 1, phaseTotal: CIRCUIT_STEPS.length });
    if (i < CIRCUIT_STEPS.length - 1) queue.push({ step: null, seconds: REST_SEC, isRest: true, afterRest: CIRCUIT_STEPS[i + 1], phase: AppState.CIRCUIT, phaseIndex: i + 2, phaseTotal: CIRCUIT_STEPS.length });
  });
  COOLDOWN_STEPS.forEach((step, i) => {
    const baseEntry = {
      step,
      isRest: false,
      phase: AppState.COOLDOWN,
      phaseIndex: i + 1,
      phaseTotal: COOLDOWN_STEPS.length,
    } as const;

    if (BILATERAL_COOLDOWN_IDS.has(step.id)) {
      queue.push({ ...baseEntry, seconds: 15, side: 'first' });
      queue.push({ ...baseEntry, seconds: 15, side: 'second' });
    } else {
      queue.push({ ...baseEntry, seconds: step.durationSec });
    }
  });
  return queue;
}

function loadSessions(): SessionEntry[] { try { const raw = localStorage.getItem(STORAGE_KEY_SESSIONS); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed as SessionEntry[] : []; } catch { return []; } }
function persistSession(entry: SessionEntry): SessionEntry[] { const updated = [...loadSessions(), entry]; try { localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated)); } catch {} return updated; }
function dayKey(dateISO: string): string { return new Date(dateISO).toDateString(); }
function computeCurrentStreak(sessions: SessionEntry[]): number { const days = new Set(sessions.filter((s) => s.completed).map((s) => dayKey(s.dateISO))); let streak = 0; const cursor = new Date(); while (days.has(cursor.toDateString())) { streak += 1; cursor.setDate(cursor.getDate() - 1); } return streak; }
function computeBestStreak(sessions: SessionEntry[]): number { const days = Array.from(new Set(sessions.filter((s) => s.completed).map((s) => dayKey(s.dateISO)))).map((d) => new Date(d).getTime()).sort((a, b) => a - b); if (!days.length) return 0; const oneDayMs = 24 * 60 * 60 * 1000; let best = 1; let run = 1; for (let i = 1; i < days.length; i += 1) { run = days[i] - days[i - 1] === oneDayMs ? run + 1 : 1; best = Math.max(best, run); } return best; }
function formatMMSS(totalSec: number): string { const safe = Math.max(0, Math.floor(totalSec)); return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`; }

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.START);
  const [sessions, setSessions] = useState<SessionEntry[]>(loadSessions);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [exercisesDone, setExercisesDone] = useState(0);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentPhaseRef = useRef<RunnerPhase | null>(null);
  const isRunning = appState === AppState.WARMUP || appState === AppState.CIRCUIT || appState === AppState.COOLDOWN;

  useWakeLock(isRunning);

  const announceEntry = (entry: QueueEntry) => { if (entry.isRest) { AudioService.announceRest(); if (entry.afterRest) AudioService.announceNext(entry.afterRest.name); } else if (entry.step) { if (entry.side === 'second') { AudioService.announceSwitchSide(); } else { const phase = entry.phase === AppState.WARMUP ? 'warmup' : entry.phase === AppState.CIRCUIT ? 'main' : 'cooldown'; AudioService.announceExercise(entry.step.name, entry.step.target, phase); } } };
  const finalizeSession = (completed: boolean, exercisesDoneCount: number) => { const totalSec = Math.round((Date.now() - startTimeRef.current) / 1000); const entry: SessionEntry = { dateISO: new Date().toISOString(), durationSec: totalSec, completed, exercisesDone: exercisesDoneCount }; const updated = persistSession(entry); setSessions(updated); setSummaryStats({ totalSec, exercisesDone: exercisesDoneCount, streak: computeCurrentStreak(updated), partial: !completed }); AudioService.stopSpeech(); currentPhaseRef.current = null; setAppState(AppState.SUMMARY); };
  const advanceEntry = (finishedEntry: QueueEntry, finishedIndex: number) => { AudioService.phaseChange(); let doneCount = exercisesDone; if (!finishedEntry.isRest && finishedEntry.step?.kind === 'main') { doneCount += 1; setExercisesDone(doneCount); } const nextIndex = finishedIndex + 1; if (nextIndex >= queue.length) { AudioService.finishFanfare(); AudioService.announceCongrats(); finalizeSession(true, doneCount); return; } const nextEntry = queue[nextIndex]; setCurrentIndex(nextIndex); setSecondsLeft(nextEntry.seconds); if (nextEntry.phase !== currentPhaseRef.current) { currentPhaseRef.current = nextEntry.phase; setAppState(nextEntry.phase); AudioService.announcePhase(PHASE_SPANISH_KEY[nextEntry.phase]); } announceEntry(nextEntry); };
  const handleStart = () => { const newQueue = buildQueue(); if (!newQueue.length) return; setQueue(newQueue); setCurrentIndex(0); setExercisesDone(0); setSecondsLeft(newQueue[0].seconds); setSummaryStats(null); startTimeRef.current = Date.now(); currentPhaseRef.current = newQueue[0].phase; setAppState(newQueue[0].phase); AudioService.announcePhase(PHASE_SPANISH_KEY[newQueue[0].phase]); announceEntry(newQueue[0]); };
  const handleSkip = () => { if (queue.length) advanceEntry(queue[currentIndex], currentIndex); };
  const handleExit = () => { AudioService.stopSpeech(); finalizeSession(false, exercisesDone); };

  useEffect(() => { if (!isRunning || !queue.length) return; const timer = window.setInterval(() => { setSecondsLeft((prev) => { if (prev <= 1) { AudioService.beep(); return 0; } return prev - 1; }); }, 1000); return () => window.clearInterval(timer); }, [isRunning, currentIndex, queue.length]);
  useEffect(() => { if (!isRunning || !queue.length || secondsLeft !== 0) return; const finished = queue[currentIndex]; if (finished) advanceEntry(finished, currentIndex); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);
  useEffect(() => { if (appState === AppState.SUMMARY) AudioService.stopSpeech(); }, [appState]);

  const currentStreak = computeCurrentStreak(sessions);
  const totalSessions = sessions.length;
  const renderStart = (<div className="flex flex-col items-center gap-6 pt-10 text-center"><div><h1 className="text-5xl font-extrabold text-blue-600"> Ejercicios Prácticos</h1><p className="mt-2 text-gray-600">Tu rutina en casa · 15 minutos</p></div><div className="w-full space-y-2 rounded-2xl bg-white p-4 text-left shadow-sm"><p>🔥 Calentamiento · 3 min</p><p>💪 Circuito · 7 ejercicios</p><p>🧘 Enfriamiento · 3 min</p></div>{sessions.length > 0 && <div className="w-full text-left"><h2 className="mb-2 text-sm font-semibold text-gray-600">Tu semana</h2><ProgressChart sessions={sessions} /></div>}<div className="grid w-full grid-cols-2 gap-3"><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-2xl font-bold text-blue-600">{currentStreak}</p><p className="text-sm text-gray-500">días seguidos</p></div><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-2xl font-bold text-blue-600">{totalSessions}</p><p className="text-sm text-gray-500">rutinas completadas</p></div></div><button onClick={handleStart} className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-semibold text-white shadow-md active:scale-95">Comenzar rutina</button><button onClick={() => setAppState(AppState.HISTORY)} className="text-sm font-medium text-blue-600 underline underline-offset-2">Ver mi progreso</button></div>);
  const renderRunner = () => { const entry = queue[currentIndex]; if (!entry) return null; const displayStep = entry.isRest ? entry.afterRest : entry.step; if (!displayStep) return null; return <div className="flex flex-col gap-4"><div className="flex items-center justify-between text-sm text-gray-500"><button onClick={handleExit} aria-label="Salir de la rutina" className="px-2 text-xl leading-none text-gray-400">×</button><span className="font-semibold text-blue-600">{PHASE_LABEL[entry.phase]} · {entry.phaseIndex}/{entry.phaseTotal}</span></div><ExerciseCard step={displayStep} secondsLeft={secondsLeft} phaseLabel={PHASE_LABEL[entry.phase]} phaseColor={entry.isRest ? REST_COLOR : WORK_COLOR} isRest={entry.isRest} nextStep={entry.isRest ? entry.afterRest ?? null : null} onSkip={handleSkip} /></div>; };
  const renderSummary = () => !summaryStats ? null : <div className="flex flex-col items-center gap-6 pt-10 text-center"><div className="text-5xl">🎉</div><h2 className="text-2xl font-bold text-blue-600">{summaryStats.partial ? 'Sesión guardada' : '¡Rutina completada!'}</h2><div className="grid w-full grid-cols-3 gap-3"><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xl font-bold text-blue-600">{formatMMSS(summaryStats.totalSec)}</p><p className="text-xs text-gray-500">tiempo total</p></div><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xl font-bold text-blue-600">{summaryStats.exercisesDone}</p><p className="text-xs text-gray-500">ejercicios</p></div><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xl font-bold text-blue-600">{summaryStats.streak}</p><p className="text-xs text-gray-500">días seguidos</p></div></div><button onClick={() => setAppState(AppState.START)} className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-semibold text-white shadow-md active:scale-95">Volver al inicio</button></div>;
  const renderHistory = () => { const bestStreak = computeBestStreak(sessions); const lastTen = [...sessions].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()).slice(0, 10); return <div className="flex flex-col gap-4"><div className="flex items-center gap-3"><button onClick={() => setAppState(AppState.START)} className="font-semibold text-blue-600">Volver</button><h2 className="text-xl font-bold text-blue-600">Mi progreso</h2></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-2xl font-bold text-blue-600">{sessions.length}</p><p className="text-sm text-gray-500">rutinas totales</p></div><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-2xl font-bold text-blue-600">{bestStreak}</p><p className="text-sm text-gray-500">mejor racha</p></div></div><ProgressChart sessions={sessions} />{!lastTen.length ? <p className="text-center text-gray-500">Todavía no hay rutinas registradas.</p> : lastTen.map((s, idx) => <div key={idx} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"><span>{new Date(s.dateISO).toLocaleDateString('es-ES')}</span><span className="text-sm text-gray-500">{formatMMSS(s.durationSec)} · {s.exercisesDone} ej.</span><span>{s.completed ? '✓' : '·'}</span></div>)}</div>; };
  const renderContent = () => { switch (appState) { case AppState.START: return renderStart; case AppState.WARMUP: case AppState.CIRCUIT: case AppState.COOLDOWN: return renderRunner(); case AppState.SUMMARY: return renderSummary(); case AppState.HISTORY: return renderHistory(); default: return null; } };
  return <div className="min-h-dvh bg-gradient-to-b from-sky-50 to-blue-100"><div className="mx-auto max-w-md p-4">{renderContent()}</div></div>;
};

export default App;
