import { describe, expect, it } from 'vitest'
import { filmPoseReachedAfterMs } from './ManeuverFilm'

describe('filmPoseReachedAfterMs', () => {
  it('returns the arrival time of the final observation posture, not its hold duration', () => {
    expect(filmPoseReachedAfterMs('dix_hallpike_r')).toBe(1540)
    expect(filmPoseReachedAfterMs('dix_hallpike_l')).toBe(1540)
    expect(filmPoseReachedAfterMs('headroll_r')).toBe(1620)
    expect(filmPoseReachedAfterMs('headroll_l')).toBe(1620)
  })
})
