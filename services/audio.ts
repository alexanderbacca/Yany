export class AudioService {
  private static ctx: AudioContext | null = null;
  private static spanishVoice: SpeechSynthesisVoice | null = null;
  private static voicesListenerAttached = false;

  private static init() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext || (window as any).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
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

  private static selectColombianSpanishVoice(
    voices: SpeechSynthesisVoice[]
  ): SpeechSynthesisVoice | null {
    const exactColombian = voices.find(
      (voice) => voice.lang.toLowerCase() === 'es-co'
    );
    if (exactColombian) return exactColombian;

    const latinAmericanSpanish = voices.find((voice) => {
      const language = voice.lang.toLowerCase();
      return language === 'es-419' || language === 'es-mx' || language === 'es-us';
    });
    if (latinAmericanSpanish) return latinAmericanSpanish;

    return voices.find((voice) => voice.lang.toLowerCase().startsWith('es')) ?? null;
  }

  private static ensureVoices() {
    if (!('speechSynthesis' in window)) return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.spanishVoice = this.selectColombianSpanishVoice(voices);
    }

    if (!this.voicesListenerAttached) {
      this.voicesListenerAttached = true;
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.spanishVoice = this.selectColombianSpanishVoice(
          window.speechSynthesis.getVoices()
        );
      });
    }
  }

  private static speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    this.ensureVoices();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (this.spanishVoice) utterance.voice = this.spanishVoice;

    window.speechSynthesis.speak(utterance);
  }

  static announceExercise(name: string, target: string) {
    this.speak(`${name}. ${target}. Vamos con calma y a tu ritmo.`);
  }

  static announceRest() {
    this.speak('Momento de descansar. Respira con tranquilidad.');
  }

  static announceNext(name: string) {
    this.speak(`El siguiente ejercicio es: ${name}.`);
  }

  static announcePhase(phase: 'calentamiento' | 'circuito' | 'enfriamiento') {
    const messages = {
      calentamiento: 'Comenzamos el calentamiento. Haz cada movimiento con calma.',
      circuito: 'Ahora sigue la parte principal de la rutina. Vas muy bien.',
      enfriamiento: 'Empezamos el enfriamiento. Respira profundo y muévete suavemente.',
    } as const;
    this.speak(messages[phase]);
  }

  static announceCongrats() {
    this.speak('¡Muy bien! Completaste tu rutina de hoy. Excelente trabajo.');
  }

  static stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}
