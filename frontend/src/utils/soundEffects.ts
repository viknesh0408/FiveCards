const playCardSlide = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 0.15; // 0.15 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(1000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
};

const playCardDiscard = (ctx: AudioContext) => {
  // A quick high-frequency pop (tap) + card slide friction
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(700, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
  oscGain.gain.setValueAtTime(0.18, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  
  const bufferSize = ctx.sampleRate * 0.1; 
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(1100, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.1);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.22, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.09);
  noise.start();
};

const playShuffle = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const time = now + i * 0.08;
    const dur = 0.12;
    
    const bufferSize = ctx.sampleRate * dur; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      data[j] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3;
    const startFreq = 800 + Math.random() * 400;
    const endFreq = 150 + Math.random() * 100;
    filter.frequency.setValueAtTime(startFreq, time);
    filter.frequency.exponentialRampToValueAtTime(endFreq, time + dur);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + dur);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(time);
  }
};

const playTickChime = (ctx: AudioContext) => {
  const freqs = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5 (Cmaj7 arpeggio)
  const now = ctx.currentTime;
  
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.8);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.85);
  });
};

const playRoundWin = (ctx: AudioContext) => {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const now = ctx.currentTime;
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.12);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.12);
    osc.stop(now + idx * 0.12 + 0.65);
  });
};

const playPenaltySound = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const freqs = [180, 185]; // Low dissonant notes
  
  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.5);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.55);
  });
};

const playUiClick = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.06);
};

const playJokerSparkle = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const time = now + i * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800 + Math.random() * 400, time);
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.13);
  }
};

class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private isEnabled(): boolean {
    return localStorage.getItem('soundEnabled') !== 'false';
  }

  playDraw() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playCardSlide(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playDiscard() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playCardDiscard(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playShuffle() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playShuffle(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playDeclare() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playTickChime(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playWin() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playRoundWin(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playPenalty() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playPenaltySound(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playClick() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playUiClick(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  playJoker() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      playJokerSparkle(ctx);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }
}

export const soundEffects = new SoundManager();
