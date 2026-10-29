const uplift = {
  duration: 3,
  seed: 354,
  loudness: -16,
  lowpass: 8000,
  highpass: 50,
  width: 0.8,
  reverb: { mix: 0.3, decay: 2.2, predelay: 0.01, damp: 6000 },
  layers: [
    {
      type: 'tone',
      wave: 'triangle',
      voices: 3,
      detune: 8,
      freq: 293.66,
      at: 0,
      gain: -4,
      filter: { type: 'lowpass', freq: 3500, q: 0.6 },
      env: { attack: 1.2, rise: 1.6, hold: 0.6, decay: 1.2, curve: 3 }
    },
    {
      type: 'tone',
      wave: 'triangle',
      voices: 3,
      detune: 8,
      freq: 369.99,
      at: 0,
      gain: -5.5,
      filter: { type: 'lowpass', freq: 3500, q: 0.6 },
      env: { attack: 1.2, rise: 1.6, hold: 0.6, decay: 1.2, curve: 3 }
    },
    {
      type: 'tone',
      wave: 'triangle',
      voices: 3,
      detune: 8,
      freq: 440,
      at: 0,
      gain: -7,
      filter: { type: 'lowpass', freq: 3500, q: 0.6 },
      env: { attack: 1.2, rise: 1.6, hold: 0.6, decay: 1.2, curve: 3 }
    },
    {
      type: 'tone',
      wave: 'triangle',
      voices: 3,
      detune: 8,
      freq: 659.26,
      at: 0,
      gain: -8.5,
      filter: { type: 'lowpass', freq: 3500, q: 0.6 },
      env: { attack: 1.2, rise: 1.6, hold: 0.6, decay: 1.2, curve: 3 }
    }
  ]
};

export default uplift;
