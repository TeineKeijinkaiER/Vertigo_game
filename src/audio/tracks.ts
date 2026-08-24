/**
 * BGM の曲データ。音源ファイルは持たず Web Audio で合成する。
 * 0 は休符。melody / counter / bass は同じ長さの配列にする。
 * intervalMs が1ステップの長さ。
 */
export type TrackId = 'opening' | 'exam'

export interface Voice {
  notes: number[]
  wave: OscillatorType
  gain: number
  /** 音の長さ。intervalMs に対する倍率 */
  hold: number
}

export interface Track {
  intervalMs: number
  voices: Voice[]
}

export const TRACKS: Record<TrackId, Track> = {
  // オープニング — ハ長調・約76bpm。3声（旋律＋対旋律＋ベース）。ドラムなし。
  opening: {
    intervalMs: 200,
    voices: [
      {
        notes: [
          523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 494, 0, 523, 0, 0, 0,
          440, 0, 523, 0, 659, 0, 587, 0, 523, 0, 494, 0, 523, 0, 0, 0,
        ],
        wave: 'triangle',
        gain: 0.022,
        hold: 1.6,
      },
      {
        notes: [
          330, 0, 0, 0, 392, 0, 0, 0, 349, 0, 0, 0, 330, 0, 0, 0,
          262, 0, 0, 0, 330, 0, 0, 0, 349, 0, 0, 0, 330, 0, 0, 0,
        ],
        wave: 'triangle',
        gain: 0.011,
        hold: 3.2,
      },
      {
        notes: [
          131, 0, 0, 0, 165, 0, 0, 0, 147, 0, 0, 0, 98, 0, 0, 0,
          110, 0, 0, 0, 131, 0, 0, 0, 147, 0, 0, 0, 131, 0, 0, 0,
        ],
        wave: 'triangle',
        gain: 0.026,
        hold: 3.2,
      },
    ],
  },
  // 診察中 — イ短調・落ち着いた2声。考えごとの邪魔をしない音量にとどめる。
  exam: {
    intervalMs: 300,
    voices: [
      {
        notes: [440, 0, 0, 523, 0, 0, 494, 0, 440, 0, 0, 392, 0, 0, 440, 0],
        wave: 'triangle',
        gain: 0.013,
        hold: 2.4,
      },
      {
        notes: [110, 0, 0, 0, 131, 0, 0, 0, 98, 0, 0, 0, 110, 0, 0, 0],
        wave: 'triangle',
        gain: 0.018,
        hold: 3.6,
      },
    ],
  },
}
