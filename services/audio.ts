import { Exercise } from "../types";

// Colombian Spanish TTS configuration
const COLOMBIAN_VOICE_PREFERENCES = ["es-CO", "es-419", "es-US", "es-MX", "es"];

let synth: SpeechSynthesis | null = null;
let preferredVoice: SpeechSynthesisVoice | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (synth) return synth;
  synth = window.speechSynthesis;
  return synth;
}

function findColombianVoice(): SpeechSynthesisVoice | null {
  const s = getSynth();
  if (!s) return null;
  
  const voices = s.getVoices();
  if (!voices || voices.length === 0) return null;
  
  // First priority: exact es-CO match
  for (const voice of voices) {
    if (voice.lang === "es-CO") {
      return voice;
    }
  }
  
  // Second priority: Latin American Spanish variants (Colombia-friendly)
  for (const pref of COLOMBIAN_VOICE_PREFERENCES) {
    for (const voice of voices) {
      if (voice.lang === pref || voice.lang.startsWith(pref.split("-")[0])) {
        if (voice.name.toLowerCase().includes("colombia") || 
            voice.name.toLowerCase().includes("latino") ||
            voice.name.toLowerCase().includes("mexico") ||
            voice.name.toLowerCase().includes("spanish")) {
          return voice;
        }
      }
    }
  }
  
  // Fallback: any Spanish voice
  for (const voice of voices) {
    if (voice.lang.startsWith("es")) {
      return voice;
    }
  }
  
  return null;
}

// Initialize voice when voices are loaded
function initializeVoice() {
  const s = getSynth();
  if (!s) return;
  
  if (s.onvoiceschanged !== undefined) {
    s.onvoiceschanged = () => {
      preferredVoice = findColombianVoice();
    };
  }
  
  // Try immediately in case voices are already loaded
  preferredVoice = findColombianVoice();
}

// Ensure voices are loaded (some browsers need this)
function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    const s = getSynth();
    if (!s) {
      resolve();
      return;
    }
    
    if (s.getVoices().length > 0) {
      preferredVoice = findColombianVoice();
      resolve();
      return;
    }
    
    const loadVoices = () => {
      preferredVoice = findColombianVoice();
      s.onvoiceschanged = null;
      resolve();
    };
    
    s.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 100);
  });
}

export function playBeep() {
  if (typeof window === "undefined") return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn("Audio beep not supported", e);
  }
}

export async function speakExerciseAnnouncement(
  exercise: Exercise,
  phase: "preparar" | "comenzar" | "descansar" | "finalizar"
): Promise<void> {
  const s = getSynth();
  if (!s) return;
  
  await ensureVoicesLoaded();
  
  // Colombian Spanish-friendly phrasing
  let message = "";
  switch (phase) {
    case "preparar":
      message = `Prepá·¡rate para ${exercise.name}. Comenzamos en tres segundos.`;
      break;
    case "comenzar":
      message = `Comencemos con ${exercise.name}. ¡Tienes ${exercise.duration} segundos!`;
      break;
    case "descansar":
      message = `Muy bien. Ahora descansa ${exercise.rest} segundos antes del siguiente ejercicio.`;
      break;
    case "finalizar":
      message = "Excelente trabajo. Has completado tu rutina de hoy.";
      break;
  }
  
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "es-CO";
  utterance.rate = 0.9;  // Slightly slower for clarity (elderly-friendly)
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  // Cancel any ongoing speech to avoid overlap
  s.cancel();
  s.speak(utterance);
}

export async function speakTimerComplete(exercise: Exercise): Promise<void> {
  const s = getSynth();
  if (!s) return;
  
  await ensureVoicesLoaded();
  
  const message = `Tiempo completado. ${exercise.name} finalizado.`;
  
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "es-CO";
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  s.cancel();
  s.speak(utterance);
}

export async function speakSessionStart(): Promise<void> {
  const s = getSynth();
  if (!s) return;
  
  await ensureVoicesLoaded();
  
  const message = "Bienvenida. Comencemos tu rutina de ejercicios de hoy.";
  
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "es-CO";
  utterance.rate = 0.85;  // Extra slow and clear for elderly users
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  s.cancel();
  s.speak(utterance);
}

export async function speakSessionComplete(): Promise<void> {
  const s = getSynth();
  if (!s) return;
  
  await ensureVoicesLoaded();
  
  const message = "Felicidades. Has terminado tu sesión. ¡Buen trabajo hoy!";
  
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "es-CO";
  utterance.rate = 0.9;
  utterance.pitch = 1.05;  // Slightly warmer tone
  utterance.volume = 1.0;
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  s.cancel();
  s.speak(utterance);
}

// Initialize voice on module load
if (typeof window !== "undefined") {
  initializeVoice();
}
