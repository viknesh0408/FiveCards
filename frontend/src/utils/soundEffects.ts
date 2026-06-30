const playCardSlide = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  
  // 1. Soft paper friction (using Pink/White Noise with a low-pass filter)
  const bufferSize = ctx.sampleRate * 0.22; // 220ms slide
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  // Bandpass filter to isolate the paper rustling frequency
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2.0;
  filter.frequency.setValueAtTime(750, now);
  filter.frequency.exponentialRampToValueAtTime(280, now + 0.22);
  
  // Lowpass filter to keep it warm and organic (no digital hiss)
  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.setValueAtTime(1400, now);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.03); // smooth attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  
  noise.connect(filter);
  filter.connect(lpFilter);
  lpFilter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
};

const playCardDiscard = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  
  // 1. Low frequency "Thump" (card hitting felt/wood table)
  const thumpOsc = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thumpOsc.type = 'sine';
  thumpOsc.frequency.setValueAtTime(105, now); // 105Hz body
  thumpOsc.frequency.exponentialRampToValueAtTime(55, now + 0.12);
  
  thumpGain.gain.setValueAtTime(0.28, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  
  thumpOsc.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thumpOsc.start(now);
  thumpOsc.stop(now + 0.14);

  // 2. High-frequency "Snap" / "Flap" (card body bending/releasing)
  const snapBufferSize = ctx.sampleRate * 0.07; // 70ms
  const snapBuffer = ctx.createBuffer(1, snapBufferSize, ctx.sampleRate);
  const snapData = snapBuffer.getChannelData(0);
  for (let i = 0; i < snapBufferSize; i++) {
    snapData[i] = Math.random() * 2 - 1;
  }
  
  const snapNoise = ctx.createBufferSource();
  snapNoise.buffer = snapBuffer;
  
  const snapFilter = ctx.createBiquadFilter();
  snapFilter.type = 'bandpass';
  snapFilter.Q.value = 4.5;
  snapFilter.frequency.setValueAtTime(2000, now); // Crisp cardboard snap
  snapFilter.frequency.exponentialRampToValueAtTime(750, now + 0.07);
  
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.11, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  
  snapNoise.connect(snapFilter);
  snapFilter.connect(snapGain);
  snapGain.connect(ctx.destination);
  snapNoise.start(now);
  
  // 3. Card surface friction (the final slide as it settles on felt)
  const slideBufferSize = ctx.sampleRate * 0.13; // 130ms
  const slideBuffer = ctx.createBuffer(1, slideBufferSize, ctx.sampleRate);
  const slideData = slideBuffer.getChannelData(0);
  for (let i = 0; i < slideBufferSize; i++) {
    slideData[i] = Math.random() * 2 - 1;
  }
  
  const slideNoise = ctx.createBufferSource();
  slideNoise.buffer = slideBuffer;
  
  const slideFilter = ctx.createBiquadFilter();
  slideFilter.type = 'lowpass';
  slideFilter.frequency.setValueAtTime(1100, now);
  
  const slideGain = ctx.createGain();
  slideGain.gain.setValueAtTime(0.0, now);
  slideGain.gain.linearRampToValueAtTime(0.14, now + 0.02); // delay slide peak slightly
  slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  
  slideNoise.connect(slideFilter);
  slideFilter.connect(slideGain);
  slideGain.connect(ctx.destination);
  slideNoise.start(now);
};

const playShuffle = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const numCards = 8;
  
  for (let i = 0; i < numCards; i++) {
    const time = now + i * 0.095; // Deal a card every 95ms
    const pitchFactor = 1.0 + (Math.random() * 0.3 - 0.15); // randomize pitch
    const volFactor = 0.85 + Math.random() * 0.3;
    
    // Thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(100 * pitchFactor, time);
    thumpOsc.frequency.exponentialRampToValueAtTime(50 * pitchFactor, time + 0.095);
    
    thumpGain.gain.setValueAtTime(0.12 * volFactor, time);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.095);
    
    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(time);
    thumpOsc.stop(time + 0.1);
    
    // Snap
    const snapBufferSize = ctx.sampleRate * 0.06;
    const snapBuffer = ctx.createBuffer(1, snapBufferSize, ctx.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let j = 0; j < snapBufferSize; j++) {
      snapData[j] = Math.random() * 2 - 1;
    }
    const snapNoise = ctx.createBufferSource();
    snapNoise.buffer = snapBuffer;
    
    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.Q.value = 3.5;
    snapFilter.frequency.setValueAtTime(1800 * pitchFactor, time);
    snapFilter.frequency.exponentialRampToValueAtTime(700 * pitchFactor, time + 0.06);
    
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.07 * volFactor, time);
    snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    
    snapNoise.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapNoise.start(time);
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
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.04; // 40ms very short click
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 5.5;
  filter.frequency.setValueAtTime(1500, now);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
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
  private lastClickAt = 0; // debounce guard for rapid tap audio stacking

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
    const now = Date.now();
    if (now - this.lastClickAt < 100) return; // 100ms debounce: drop stacked decodes
    this.lastClickAt = now;
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
