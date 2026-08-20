import { ACTION_MAP, DISPOSITION_MAP, IMAGING_CRITERIA } from '../data/actions'
import { MANEUVER_KINDS } from '../data/maneuvers'
import type { CaseDef } from '../data/types'
import type { GameState } from './state'

export interface ScoreLine {
  label: string
  earned: number
  max: number
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
  penalty: number
  total: number
  rank: 'S' | 'A' | 'B' | 'C' | 'D'
  ending: EndingTier
  redFlagsFound: string[]
  redFlagsMissed: string[]
  diagnosisCorrect: boolean
  sideCorrect: boolean
  /** 入院を選び、翌日の再検で診断が確定する展開に入ったか */
  showsDay2: boolean
}

const MAX = {
  process: 25,
  recommended: 5,
  grace: 5,
  criteria: 8,
  mri: 12,
  diagnosis: 15,
  side: 5,
  maneuver: 5,
  treatment: 5,
  disposition: 15,
}

function label(id: string): string {
  return ACTION_MAP.get(id)?.label ?? DISPOSITION_MAP.get(id)?.label ?? id
}

export function scoreGame(c: CaseDef, s: GameState): ScoreResult {
  const lines: ScoreLine[] = []
  const deductions: Deduction[] = []
  const did = (id: string) => s.performed.includes(id)

  // ── 診察プロセス（必須）
  const missedRequired = c.required.filter((id) => !did(id))
  const requiredRate = c.required.length === 0 ? 1 : (c.required.length - missedRequired.length) / c.required.length
  lines.push({
    label: '診察プロセス（必須項目）',
    earned: Math.round(MAX.process * requiredRate),
    max: MAX.process,
    notes: missedRequired.length
      ? [`実施しなかった必須の診察：${missedRequired.map(label).join('、')}`]
      : ['必要な診察をすべて行っています'],
  })

  // ── 診察プロセス（推奨）
  const doneRec = c.recommended.filter(did)
  const recRate = c.recommended.length === 0 ? 1 : doneRec.length / c.recommended.length
  lines.push({
    label: '診察プロセス（推奨項目）',
    earned: Math.round(MAX.recommended * recRate),
    max: MAX.recommended,
    notes:
      doneRec.length === c.recommended.length
        ? ['推奨される診察も網羅しています']
        : [`さらに拾えた所見：${c.recommended.filter((id) => !did(id)).map(label).join('、')}`],
  })

  // ── GRACE-3 の分類
  const graceAssessed = did('as_grace')
  const graceOk = graceAssessed && s.vestibularAnswer === c.vestibularType
  lines.push({
    label: 'めまいのタイプ（GRACE-3）',
    earned: graceOk ? MAX.grace : 0,
    max: MAX.grace,
    notes: [
      s.vestibularAnswer === null
        ? `めまいのタイプを分類していません。正解は ${c.vestibularType}`
        : graceOk
          ? `正解：${c.vestibularType}`
          : `あなたの判定：${s.vestibularAnswer} ／ 正解：${c.vestibularType}`,
    ],
  })

  // ── HOWTO 4条件
  const criteriaAssessed = did('as_criteria')
  const hits = c.criteria.filter((v, i) => v === s.criteriaAnswers[i]).length
  const criteriaNotes = criteriaAssessed
    ? c.criteria
        .map((v, i) => (v === s.criteriaAnswers[i] ? null : `「${IMAGING_CRITERIA[i]}」→ 正解は${v ? 'はい' : 'いいえ'}`))
        .filter((x): x is string => x !== null)
    : ['画像検査の適応（HOWTO 4条件）を検討していません']
  lines.push({
    label: '画像適応の4条件（HOWTO）',
    earned: criteriaAssessed ? Math.round((MAX.criteria * hits) / c.criteria.length) : 0,
    max: MAX.criteria,
    notes: criteriaNotes.length ? criteriaNotes : ['4条件すべて正しく判定できています'],
  })

  // ── MRIを撮るかどうかの判断
  const tookMri = did('st_mri')
  let mriEarned = 0
  const mriNotes: string[] = []
  switch (c.mriStance) {
    case 'contraindicated':
      mriEarned = tookMri ? 0 : MAX.mri
      mriNotes.push(
        tookMri
          ? `この患者にMRIは禁忌です。${c.mriContraindication ?? ''}`
          : 'MRIが禁忌であることに気づき、撮影を避けています',
      )
      if (tookMri) {
        deductions.push({
          label: '頭部MRIを撮る',
          points: -30,
          reason: `MRI禁忌の患者に撮影を指示している。${c.mriContraindication ?? ''}`,
        })
      }
      break
    case 'indicated':
      mriEarned = tookMri ? MAX.mri : 0
      mriNotes.push(tookMri ? 'MRIの適応を正しく判断しています' : 'この症例ではMRIを撮るべきでした')
      if (!tookMri) {
        deductions.push({
          label: 'MRIを撮らなかった',
          points: -10,
          reason: '中枢性を疑う所見が揃っており、MRIを撮るべきでした',
        })
      }
      break
    case 'unnecessary':
      mriEarned = tookMri ? Math.round(MAX.mri / 2) : MAX.mri
      mriNotes.push(tookMri ? '所見が典型的であり、MRIは不要でした' : 'MRIが不要な症例と正しく判断しています')
      if (tookMri) {
        deductions.push({ label: '頭部MRIを撮る', points: -3, reason: '所見が典型的でありMRIは不要でした' })
      }
      break
    case 'optional':
      mriEarned = MAX.mri
      mriNotes.push(
        tookMri ? 'リスク因子を考えてMRIを撮る判断は妥当です' : '所見からMRIを省略する判断は妥当です',
      )
      break
  }
  lines.push({ label: 'MRIを撮るかの判断', earned: mriEarned, max: MAX.mri, notes: mriNotes })

  // ── 診断
  const dxCorrect = s.diagnosisAnswer === c.diagnosis.correct
  const sideCorrect = !c.diagnosis.asksSide || s.sideAnswer === c.diagnosis.side
  lines.push({
    label: '診断',
    earned: dxCorrect ? MAX.diagnosis : 0,
    max: MAX.diagnosis,
    notes: [
      dxCorrect ? `正解：${c.diagnosis.correct}` : `あなたの診断：${s.diagnosisAnswer ?? '未回答'} ／ 正解：${c.diagnosis.correct}`,
    ],
  })
  if (c.diagnosis.asksSide) {
    lines.push({
      label: '患側',
      earned: dxCorrect && sideCorrect ? MAX.side : 0,
      max: MAX.side,
      notes: [sideCorrect ? '患側も正しく判定できています' : `患側の正解：${c.diagnosis.side === 'R' ? '右' : '左'}`],
    })
  }

  // ── 耳石置換法（適応のある症例のみ採点）
  const maneuverDone = s.maneuver
  if (c.maneuver) {
    const kindOk = maneuverDone?.kind === c.maneuver.kind
    const sideOk = maneuverDone?.side === c.maneuver.side
    const perfect = Boolean(maneuverDone?.perfect) && kindOk && sideOk
    const correctLabel = `${MANEUVER_KINDS.find((m) => m.id === c.maneuver!.kind)?.label}（${c.maneuver.side === 'R' ? '右' : '左'}）`
    lines.push({
      label: '耳石置換法',
      earned: perfect ? MAX.maneuver : kindOk && sideOk ? Math.round(MAX.maneuver / 2) : 0,
      max: MAX.maneuver,
      notes: [
        !maneuverDone
          ? `耳石置換法を行っていません。正解は ${correctLabel}`
          : perfect
            ? `${correctLabel} を正しい手順で施行できています`
            : !kindOk
              ? `手技の選択が違います。正解は ${correctLabel}`
              : !sideOk
                ? `患側が違います。正解は ${correctLabel}`
                : '手技と患側は正しいものの、手順に誤りがあります',
      ],
    })
  } else if (maneuverDone) {
    deductions.push({
      label: '耳石置換法',
      points: -10,
      reason: 'この症例に耳石置換法の適応はありません',
    })
  }

  // ── その他の治療
  const missedTx = c.treatment.required.filter((id) => !did(id))
  const txRate =
    c.treatment.required.length === 0 ? 1 : (c.treatment.required.length - missedTx.length) / c.treatment.required.length
  lines.push({
    label: '治療・指導',
    earned: Math.round(MAX.treatment * txRate),
    max: MAX.treatment,
    notes: missedTx.length ? [`行うべきだった治療：${missedTx.map(label).join('、')}`] : ['必要な治療を実施しています'],
  })

  // ── 方針
  const dispoId = s.dispositionChoice
  const dispoForbidden = dispoId ? c.disposition.forbidden.find((f) => f.id === dispoId) : undefined
  const dispoCorrect = dispoId !== null && c.disposition.correct.includes(dispoId)
  lines.push({
    label: '方針',
    earned: dispoCorrect ? MAX.disposition : dispoForbidden || !dispoId ? 0 : Math.round(MAX.disposition / 2),
    max: MAX.disposition,
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

  // ── 減点（診察・治療）
  for (const p of c.penalties) {
    if (did(p.id)) deductions.push({ label: label(p.id), points: p.points, reason: p.reason })
  }
  for (const f of c.treatment.forbidden) {
    if (did(f.id)) deductions.push({ label: label(f.id), points: f.points, reason: f.reason })
  }

  const earned = lines.reduce((a, l) => a + l.earned, 0)
  const maxSum = lines.reduce((a, l) => a + l.max, 0)
  const penalty = deductions.reduce((a, d) => a + d.points, 0)
  const total = Math.max(0, Math.min(100, Math.round((100 * earned) / maxSum) + penalty))

  const rank: ScoreResult['rank'] = total >= 95 ? 'S' : total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : 'D'

  const dischargedWhenUnsafe = !c.dischargeAfterNegativeOk && dispoId === 'dp_home' && !dispoCorrect
  const severeMistake = deductions.some((d) => d.points <= -10)

  let ending: EndingTier
  if (dischargedWhenUnsafe || severeMistake) ending = 'worst'
  else if (dxCorrect && sideCorrect && dispoCorrect && missedTx.length === 0) ending = 'best'
  else if (dxCorrect && dispoCorrect) ending = 'good'
  else ending = 'bad'

  return {
    lines,
    deductions,
    penalty,
    total,
    rank,
    ending,
    redFlagsFound: c.redFlagActions.filter(did).map(label),
    redFlagsMissed: c.redFlagActions.filter((id) => !did(id)).map(label),
    diagnosisCorrect: dxCorrect,
    sideCorrect,
    showsDay2: dispoId === 'dp_admit' && c.day2 !== null,
  }
}
