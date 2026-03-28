/**
 * Audio notifications for Pomodoro phase transitions.
 * Uses Web Audio API (oscillator-based) — no external files needed.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Play a sequence of tones.
 * Each note: { freq, duration, delay } in seconds.
 */
function playTones(
  notes: { freq: number; duration: number; delay: number; type?: OscillatorType }[],
  volume = 0.15,
) {
  const ctx = getAudioContext();

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const now = ctx.currentTime;

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = note.type ?? 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.delay);

    // Envelope: quick attack, sustain, quick release
    gain.gain.setValueAtTime(0, now + note.delay);
    gain.gain.linearRampToValueAtTime(volume, now + note.delay + 0.02);
    gain.gain.setValueAtTime(volume, now + note.delay + note.duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + note.delay + note.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.delay);
    osc.stop(now + note.delay + note.duration);
  }
}

/**
 * Cheerful/triumphant tone — work phase complete!
 * Ascending arpeggio (C5 → E5 → G5 → C6).
 */
export function playWorkCompleteTone(): void {
  playTones([
    { freq: 523.25, duration: 0.15, delay: 0, type: 'sine' },     // C5
    { freq: 659.25, duration: 0.15, delay: 0.15, type: 'sine' },   // E5
    { freq: 783.99, duration: 0.15, delay: 0.3, type: 'sine' },    // G5
    { freq: 1046.5, duration: 0.35, delay: 0.45, type: 'sine' },   // C6 (held)
  ], 0.12);
}

/**
 * Gentle chime — break phase complete, back to work.
 * Soft descending two-note chime.
 */
export function playBreakCompleteTone(): void {
  playTones([
    { freq: 783.99, duration: 0.25, delay: 0, type: 'sine' },      // G5
    { freq: 523.25, duration: 0.35, delay: 0.3, type: 'sine' },    // C5
  ], 0.1);
}
