// Single source of truth for video timing.
// Scene durations are sized so the *natural* voiceover length fits comfortably
// without atempo time-stretching (which causes fast-then-slow artifacts).

export const FPS = 30;

export const SCENES = {
  problem:  { from: 0,    dur: 150 }, // 5.0s
  solution: { from: 150,  dur: 135 }, // 4.5s
  ai:       { from: 285,  dur: 150 }, // 5.0s
  quiz:     { from: 435,  dur: 120 }, // 4.0s
  product:  { from: 555,  dur: 165 }, // 5.5s
  delivery: { from: 720,  dur: 135 }, // 4.5s
  cta:      { from: 855,  dur: 135 }, // 4.5s — ends at frame 990
} as const;

export const TOTAL_FRAMES = 990; // 33s

export const SCENE_SECONDS: Record<keyof typeof SCENES, number> = {
  problem:  SCENES.problem.dur / FPS,
  solution: SCENES.solution.dur / FPS,
  ai:       SCENES.ai.dur / FPS,
  quiz:     SCENES.quiz.dur / FPS,
  product:  SCENES.product.dur / FPS,
  delivery: SCENES.delivery.dur / FPS,
  cta:      SCENES.cta.dur / FPS,
};
