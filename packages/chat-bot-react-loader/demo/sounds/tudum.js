const tudum = {
  duration: 3.2,
  seed: 2015,
  loudness: -15,
  lowpass: 5200,
  highpass: 32,
  width: 0.55,
  reverb: { mix: 0.26, decay: 2.3, predelay: 0.018, damp: 3200, lowcut: 80 },
  layers: [
    {
      type: 'noise',
      color: 'white',
      at: 0,
      gain: -11,
      punch: true,
      filter: { type: 'bandpass', freq: 2100, q: 1.4 },
      env: { attack: 0.001, decay: 0.028, curve: 7 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: -9,
      filter: { type: 'bandpass', freq: 420, q: 0.9 },
      env: { attack: 0.0015, decay: 0.07, curve: 6 }
    },
    {
      type: 'tone',
      freq: { from: 240, to: 110, time: 0.08, curve: 4 },
      at: 0,
      gain: -13,
      env: { attack: 0.002, decay: 0.11, curve: 6 }
    },
    {
      type: 'tone',
      freq: 73.42,
      at: 0,
      gain: -10,
      partials: [
        [1, 1, 1],
        [2, 0.55, 0.7],
        [2.98, 0.18, 0.45]
      ],
      env: { attack: 0.006, decay: 0.38, curve: 5 }
    },
    {
      type: 'tone',
      freq: 146.83,
      at: 0,
      gain: -11,
      env: { attack: 0.005, decay: 0.28, curve: 5 }
    },
    {
      type: 'tone',
      freq: 87,
      at: 0,
      gain: -12,
      partials: [
        [1, 1, 1],
        [2.76, 0.4, 0.7],
        [5.4, 0.12, 0.4]
      ],
      env: { attack: 0.003, decay: 0.45, curve: 5 }
    },
    {
      type: 'noise',
      color: 'white',
      at: 0.42,
      gain: -5,
      punch: true,
      filter: { type: 'bandpass', freq: 1900, q: 1.3 },
      env: { attack: 0.001, decay: 0.03, curve: 7 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0.42,
      gain: -3,
      filter: { type: 'bandpass', freq: 380, q: 0.85 },
      env: { attack: 0.0015, decay: 0.08, curve: 6 }
    },
    {
      type: 'tone',
      freq: { from: 210, to: 95, time: 0.09, curve: 4 },
      at: 0.42,
      gain: -8,
      env: { attack: 0.002, decay: 0.13, curve: 6 }
    },
    {
      type: 'tone',
      freq: 73.42,
      at: 0.42,
      gain: -3,
      fm: { ratio: 1.01, index: { from: 0.8, to: 0.08, time: 0.35 } },
      partials: [
        [1, 1, 1],
        [2, 0.62, 0.75],
        [2.98, 0.22, 0.5]
      ],
      env: { attack: 0.006, decay: 0.9, curve: 4 }
    },
    {
      type: 'tone',
      freq: 146.83,
      at: 0.42,
      gain: -7,
      env: { attack: 0.005, decay: 0.7, curve: 4 }
    },
    {
      type: 'tone',
      freq: 47,
      at: 0.42,
      gain: -6,
      env: { attack: 0.01, decay: 1.4, curve: 4 }
    },
    {
      type: 'tone',
      freq: 98,
      at: 0.42,
      gain: -9,
      partials: [
        [1, 1, 1],
        [2.76, 0.45, 0.75],
        [5.4, 0.14, 0.45]
      ],
      env: { attack: 0.004, decay: 0.85, curve: 5 }
    },
    {
      type: 'tone',
      wave: 'triangle',
      voices: 4,
      detune: 16,
      freq: { from: 73.42, to: 78, time: 1.4, curve: 2 },
      at: 0.44,
      gain: -8,
      filter: {
        type: 'lowpass',
        freq: {
          points: [
            [0, 280],
            [0.35, 2400],
            [1.6, 700]
          ]
        },
        q: 0.55
      },
      env: { attack: 0.28, rise: 2.4, hold: 0.12, decay: 1.5, curve: 3 }
    },
    {
      type: 'tone',
      wave: 'triangle',
      voices: 3,
      detune: 14,
      freq: { from: 293.66, to: 311, time: 1.4, curve: 2 },
      at: 0.44,
      gain: -11,
      filter: {
        type: 'lowpass',
        freq: {
          points: [
            [0, 400],
            [0.35, 3200],
            [1.6, 900]
          ]
        },
        q: 0.5
      },
      env: { attack: 0.32, rise: 2.2, hold: 0.1, decay: 1.45, curve: 3 }
    },
    {
      type: 'tone',
      wave: 'sine',
      voices: 2,
      detune: 8,
      freq: { from: 587.33, to: 622, time: 1.4, curve: 2 },
      at: 0.46,
      gain: -14,
      env: { attack: 0.38, rise: 2, hold: 0.08, decay: 1.2, curve: 3 }
    }
  ]
};

export default tudum;
