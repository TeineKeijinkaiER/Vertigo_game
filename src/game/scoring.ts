import { ACTION_MAP, DISPOSITION_MAP, IMAGING_CRITERIA, MANEUVER_IDS, STUDY_MAP, TREATMENT_MAP } from '../data/actions'
import type { CaseDef } from '../data/types'
import type { GameState } from './state'

export interface ScoreLine {
  label: string
  earned: number
  max: number
  /** 講評に出す具体的な指摘 */
  notes: string[]
}

export interface Deduction {
  label: string
  points: number
  reason: string
}

export type EndingTier = 'best' | 'good' | 'bad' | 'worst'

export interface ScoreResult {
  lines: ScoreLine[]
  deductions: Deduction[]
  subtotal: number
  penalty: number
  total: number
  rank: 'S' | 'A' | 'B' | 'C' | 'D'
  ending: EndingTier
  /** 拾えた赤旗 / 拾えなかった赤旗 */
  redFlagsFound: string[]
  redFlagsMissed: string[]
  diagnosisCorrect: boolean
  sideCorrect: boolean
}

const MAX_PROCESS = 25
const MAX_RECOMMENDED = 5
const MAX_TRIAGE = 5
const MAX_CRITERIA = 8
const MAX_IMAGING = 7
const MAX_DISPOSITION = 20
const MAX_DIAGNOSIS = 15
const MAX_SIDE = 5
const MAX_TREATMENT = 10

function label(id: string): string {
  return (
    ACTION_MAP.get(id)?.label ??
    STUDY_MAP.get(id)?.label ??
    TREATMENT_MAP.get(id)?.label ??
    DISPOSITION_MAP.get(id)?.label ??
    id
  )
}

export function scoreGame(c: CaseDef, s: GameState): ScoreResult {
  const lines: ScoreLine[] = []
  const deductions: Deduction[] = []

  // 耳石置換法は診察中の「てあて」でも治療フェーズでも選べる。どちらで実施しても同じ扱いにする。
  const treatmentsDone = new Set([
    ...s.treatmentsChosen,
    ...s.performed.filter((id) => MANEUVER_IDS.includes(id)),
  ])

  // ── 診察プロセス（必須）
  const missedRequired = c.required.filter((id) => !s.performed.includes(id))
  const requiredRate = c.required.length === 0 ? 1 : (c.required.length - missedRequired.length) / c.required.length
  lines.push({
    label: '診察プロセス（必須項目）',
    earned: Math.round(MAX_PROCESS * requiredRate),
    max: MAX_PROCESS,
    notes: missedRequired.length
      ? [`実施しなかった必須の診察：${missedRequired.map(label).join('、')}`]
      : ['必要な診察をすべて行っています'],
  })

  // ── 診察プロセス（推奨）
  const doneRecommended = c.recommended.filter((id) => s.performed.includes(id))
  const recRate = c.recommended.length === 0 ? 1 : doneRecommended.length / c.recommended.length
  lines.push({
    label: '診察プロセス（推奨項目）',
    earned: Math.round(MAX_RECOMMENDED * recRate),
    max: MAX_RECOMMENDED,
    notes:
      doneRecommended.length === c.recommended.length
        ? ['推奨される診察も網羅しています']
        : [`さらに拾えた所見：${c.recommended.filter((id) => !s.performed.includes(id)).map(label).join('、')}`],
  })

  // ── めまいタイプ（GRACE-3）
  const triageOk = s.vestibularAnswer === c.vestibularType
  lines.push({
    label: 'めまいタイプの判定',
    earned: triageOk ? MAX_TRIAGE : 0,
    max: MAX_TRIAGE,
    notes: [triageOk ? `正解：${c.vestibularType}` : `あなたの判定：${s.vestibularAnswer ?? '未回答'} ／ 正解：${c.vestibularType}`],
  })

  // ── HOWTO 4条件
  const criteriaHits = c.criteria.filter((v, i) => v === s.criteriaAnswers[i]).length
  const criteriaNotes = c.criteria
    .map((v, i) => (v === s.criteriaAnswers[i] ? null : `「${IMAGING_CRITERIA[i].question}」→ 正解は${v ? 'はい' : 'いいえ'}`))
    .filter((x): x is string => x !== null)
  lines.push({
    label: '画像適応の4条件（HOWTO）',
    earned: Math.round((MAX_CRITERIA * criteriaHits) / c.criteria.length),
    max: MAX_CRITERIA,
    notes: criteriaNotes.length ? criteriaNotes : ['4条件すべて正しく判定できています'],
  })

  // ── 撮像の選択
  const orderedImaging = s.studiesOrdered.filter((id) => ['st_ct', 'st_mri', 'st_mra', 'st_cta'].includes(id))
  let imagingEarned = 0
  const imagingNotes: string[] = []
  if (c.imagingStance === 'indicated') {
    const hitExpected = c.imagingExpected.length === 0 ? orderedImaging.length > 0 : c.imagingExpected.some((id) => s.studiesOrdered.includes(id))
    imagingEarned = hitExpected ? MAX_IMAGING : 0
    imagingNotes.push(
      hitExpected
        ? '画像検査の適応を正しく判断しています'
        : `この症例では画像検査が必要でした（${c.imagingExpected.map(label).join('、') || '頭部MRIまたはCT'}）`,
    )
  } else if (c.imagingStance === 'unnecessary') {
    imagingEarned = orderedImaging.length === 0 ? MAX_IMAGING : Math.round(MAX_IMAGING / 2)
    imagingNotes.push(
      orderedImaging.length === 0
        ? '画像検査が不要な症例と正しく判断しています'
        : '所見が典型的であり、この症例で画像検査は不要でした',
    )
  } else {
    imagingEarned = MAX_IMAGING
    imagingNotes.push(
      orderedImaging.length > 0
        ? 'リスク因子を考えて画像を撮る判断は妥当です'
        : '所見から画像を省略する判断は妥当です',
    )
  }
  lines.push({ label: '撮像の選択', earned: imagingEarned, max: MAX_IMAGING, notes: imagingNotes })

  // ── 方針（画像陰性後の判断を含む最重要項目）
  const dispoId = s.dispositionChoice
  const dispoForbidden = dispoId ? c.disposition.forbidden.find((f) => f.id === dispoId) : undefined
  const dispoCorrect = dispoId !== null && c.disposition.correct.includes(dispoId)
  let dispoEarned = 0
  if (dispoCorrect) dispoEarned = MAX_DISPOSITION
  else if (!dispoForbidden && dispoId) dispoEarned = Math.round(MAX_DISPOSITION / 2)
  lines.push({
    label: '方針（帰宅／入院／コンサルト）',
    earned: dispoEarned,
    max: MAX_DISPOSITION,
    notes: [
      dispoCorrect
        ? `「${label(dispoId!)}」は妥当な方針です`
        : dispoForbidden
          ? dispoForbidden.reason
          : `より適切な方針：${c.disposition.correct.map(label).join(' / ')}`,
    ],
  })
  if (dispoForbidden) {
    deductions.push({ label: label(dispoForbidden.id), points: dispoForbidden.points, reason: dispoForbidden.reason })
  }

  // ── 診断
  const dxCorrect = s.diagnosisAnswer === c.diagnosis.correct
  const sideCorrect = !c.diagnosis.asksSide || s.sideAnswer === c.diagnosis.side
  lines.push({
    label: '診断',
    earned: dxCorrect ? MAX_DIAGNOSIS : 0,
    max: MAX_DIAGNOSIS,
    notes: [dxCorrect ? `正解：${c.diagnosis.correct}` : `あなたの診断：${s.diagnosisAnswer ?? '未回答'} ／ 正解：${c.diagnosis.correct}`],
  })
  if (c.diagnosis.asksSide) {
    lines.push({
      label: '患側',
      earned: dxCorrect && sideCorrect ? MAX_SIDE : 0,
      max: MAX_SIDE,
      notes: [sideCorrect ? '患側も正しく判定できています' : `患側の正解：${c.diagnosis.side === 'R' ? '右' : '左'}`],
    })
  }

  // ── 治療
  const missedTx = c.treatment.required.filter((id) => !treatmentsDone.has(id))
  const txRate =
    c.treatment.required.length === 0 ? 1 : (c.treatment.required.length - missedTx.length) / c.treatment.required.length
  lines.push({
    label: '治療',
    earned: Math.round(MAX_TREATMENT * txRate),
    max: MAX_TREATMENT,
    notes: missedTx.length ? [`行うべきだった治療：${missedTx.map(label).join('、')}`] : ['必要な治療を実施しています'],
  })

  // ── 減点（診察・検査・治療）
  for (const p of c.penalties) {
    if (s.performed.includes(p.id)) deductions.push({ label: label(p.id), points: p.points, reason: p.reason })
  }
  for (const p of c.studyPenalties) {
    if (s.studiesOrdered.includes(p.id)) deductions.push({ label: label(p.id), points: p.points, reason: p.reason })
  }
  for (const f of c.treatment.forbidden) {
    if (treatmentsDone.has(f.id)) deductions.push({ label: label(f.id), points: f.points, reason: f.reason })
  }

  const subtotal = lines.reduce((a, l) => a + l.earned, 0)
  const penalty = deductions.reduce((a, d) => a + d.points, 0)
  const total = Math.max(0, Math.min(100, subtotal + penalty))

  const rank: ScoreResult['rank'] = total >= 95 ? 'S' : total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : 'D'

  // ── エンディング判定
  const dischargedWhenUnsafe =
    !c.dischargeAfterNegativeOk && (dispoId === 'dp_home' || dispoId === 'dp_ent') && !c.disposition.correct.includes(dispoId)
  const severeMistake = deductions.some((d) => d.points <= -10)

  let ending: EndingTier
  if (dischargedWhenUnsafe || severeMistake) ending = 'worst'
  else if (dxCorrect && sideCorrect && dispoCorrect && missedTx.length === 0) ending = 'best'
  else if (dxCorrect && dispoCorrect) ending = 'good'
  else ending = 'bad'

  const redFlagsFound = c.redFlagActions.filter((id) => s.performed.includes(id)).map(label)
  const redFlagsMissed = c.redFlagActions.filter((id) => !s.performed.includes(id)).map(label)

  return {
    lines,
    deductions,
    subtotal,
    penalty,
    total,
    rank,
    ending,
    redFlagsFound,
    redFlagsMissed,
    diagnosisCorrect: dxCorrect,
    sideCorrect,
  }
}
