export type Voice = {start: number; end: number; stopAt: (time: number) => void; cancel: () => void};

export function sound(context: AudioContext, frequency: number, at: number, duration: number, volume: number, output: AudioNode = context.destination, attack = 0.008, release = 0.03): Voice {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  attack = Math.min(attack, duration / 3);
  release = Math.min(release, duration / 3);
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + attack);
  gain.gain.setValueAtTime(volume, at + duration - release);
  gain.gain.linearRampToValueAtTime(0, at + duration);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.onended = () => {oscillator.disconnect(); gain.disconnect();};
  oscillator.start(at);
  oscillator.stop(at + duration + 0.01);
  const voice: Voice = {start: at, end: at + duration,
    stopAt: time => {
      if (voice.end <= time) return;
      if (voice.start >= time) {voice.cancel(); return;}
      const fade = Math.max(context.currentTime, time - 0.012);
      const elapsed = fade - at;
      const level = elapsed < attack ? volume * Math.max(0, elapsed / attack)
        : elapsed > duration - release ? volume * Math.max(0, (duration - elapsed) / release) : volume;
      gain.gain.cancelScheduledValues(fade);
      gain.gain.setValueAtTime(level, fade);
      gain.gain.linearRampToValueAtTime(0, time);
      oscillator.stop(time);
      voice.end = time;
    },
    cancel: () => {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      oscillator.stop(context.currentTime);
      voice.end = context.currentTime;
    },
  };
  return voice;
}
