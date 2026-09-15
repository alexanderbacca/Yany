export class AudioService {
  private static ctx: AudioContext | null = null;
  private static spanishVoice: SpeechSynthesisVoice | null = null;
  private static voicesListenerAttached = false;

  private static init() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private static tone(
    freq: number,
    startOffsetSec: number,
    durationSec: number,
    volume = 0.2
  ) {
    this.init();
    if (!this.ctx) return;

    const start = this.ctx.currentTime + startOffsetSec;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + durationSec + 0.05);
  }

  static beep() {
    this.tone(880, 0, 0.15);
  }

  static phaseChange() {
    this.tone(660, 0, 0.2);
    this.tone(990, 0.22, 0.2);
  }

  static finishFanfare() {
    this.tone(523, 0, 0.25);
    this.tone(659, 0.27, 0.25);
    this.tone(784, 0.54, 0.35);
  }

  private static ensureVoices() {
    if (!('speechSynthesis' in window)) return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.spanishVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('es')) ?? null;
    }

    if (!this.voicesListenerAttached) {
      this.voicesListenerAttached = true;
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        const vs = window.speechSynthesis.getVoices();
        this.spanishVoice =
          vs.find((v) => v.lang.toLowerCase().startsWith('es')) ?? null;
      });
    }
  }

  private static speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    this.ensureVoices();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    if (this.spanishVoice) {
      utterance.voice = this.spanishVoice;
    }
    window.speechSynthesis.speak(utterance);
  }

  static announceExercise(name: string, target: string) {
    this.speak(`${name}. ${target}.`);
  }

  static announceRest() {
    this.speak('Descanso.');
  }

  static announceNext(name: string) {
    this.speak(`Siguiente: ${name}.`);
  }

  static announcePhase(phase: 'calentamiento' | 'circuito' | 'enfriamiento') {
    const messages = {
      calentamiento: 'Comienza el calentamiento.',
      circuito: 'Comienza el circuito principal.',
      enfriamiento: 'Comienza el enfriamiento.',
    } as const;
    this.speak(messages[phase]);
  }

  static announceCongrats() {
    this.speak('¡Muy bien! Rutina completada.');
  }

  static stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
