// Sonido de notificación generado con Web Audio API (sin archivos de audio).
// Un "tilín" suave de dos notas ascendentes, tipo aviso de mensajería —
// no una alarma.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

// Desbloquea/reactiva el AudioContext. Conviene llamarlo desde un gesto del
// usuario (ej: al activar las alertas) para que luego el "tilín" pueda sonar
// aunque se dispare desde un timer.
export function primeAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

// Reproduce el "tilín": dos notas sine cortas con envolvente suave (sin clicks).
// volume: 0..1 (default 0.6). El pico real se escala desde este valor.
export function playNotificationChime(volume = 0.6): void {
  const vol = Math.min(1, Math.max(0, volume));
  if (vol <= 0) return; // mute total

  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const peak = 0.3 * vol; // pico máximo de ganancia
  const now = ctx.currentTime;
  const notes = [
    { freq: 988, start: 0, dur: 0.16 }, // Si5
    { freq: 1319, start: 0.11, dur: 0.22 }, // Mi6
  ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;

    const t0 = now + n.start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.02); // ataque suave
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur); // cola suave

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }
}
