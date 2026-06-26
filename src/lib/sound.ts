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

// Keep-alive: mantiene el AudioContext "running" mientras las alertas están
// activas, para que el "tilín" pueda sonar con la pestaña en segundo plano
// (los navegadores suspenden el audio de tabs ocultas). Un oscilador a ganancia
// inaudible conectado al destination evita que el contexto se suspenda.
// Debe arrancarse desde un gesto del usuario (toggle de alertas).
let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

export function startAudioKeepAlive(): void {
  const ctx = getCtx();
  if (!ctx || keepAliveOsc) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.0001; // prácticamente inaudible, pero mantiene el ctx vivo
  osc.frequency.value = 440;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  keepAliveOsc = osc;
  keepAliveGain = gain;
}

export function stopAudioKeepAlive(): void {
  try {
    keepAliveOsc?.stop();
    keepAliveOsc?.disconnect();
    keepAliveGain?.disconnect();
  } catch {
    /* ya estaba detenido */
  }
  keepAliveOsc = null;
  keepAliveGain = null;
}

// Reproduce el "tilín": dos notas sine cortas con envolvente suave (sin clicks).
// volume: 0..1 (default 0.6). El pico real se escala desde este valor.
export function playNotificationChime(volume = 0.6): void {
  const vol = Math.min(1, Math.max(0, volume));
  if (vol <= 0) return; // mute total

  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const peak = 0.8 * vol; // pico máximo de ganancia
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
