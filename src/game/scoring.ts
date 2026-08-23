import {
  ACTION_MAP,
  asksSide,
  ATAXIA_GRADES,
  DISPOSITION_MAP,
  IMAGING_CRITERIA,
  SUBTYPE_LABEL,
} from '../data/actions'
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
  showsDay2: boolean
}

const MAX = {
  process: 22,
  recommended: 4,
  grace: 5,
  subtype: 5,
  criteria: 8,
  imaging: 12,
  diagnosis: 15,
  side: 5,
  maneuver: 5,
  treatment: 4,
  disposition: 15,
}

function label(id: string): string {
  return ACTION_MAP.get(id)?.label ?? DISPOSITION_MAP.get(id)?.label ?? id
}

export function scoreGame(c: CaseDef, s: GameState): ScoreResult {
  const lines: ScoreLine[] = []
  const deductions: Deduction[] = []
  const did = (id: string) => s.performed.includes(id)

  // ── 診察プロセス
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

  // ── みたてる：GRACE-3 の分類
  const assessed = did('as_dx')
  const graceOk = assessed && s.vestibularAnswer === c.vestibularType
  lines.push({
    label: 'めまいの分類（GRACE-3）',
    earned: graceOk ? MAX.grace : 0,
    max: MAX.grace,
    notes: [
      !assessed
        ? `めまいを分類していません。正解は ${c.vestibularType}`
        : graceOk
          ? `正解：${c.vestibularType}`
          : `あなたの判定：${s.vestibularAnswer} ／ 正解：${c.vestibularType}`,
    ],
  })

  // ── みたてる：細かい鑑別
  const subOk = assessed && s.subtypeAnswer === c.subtype
  lines.push({
    label: '鑑別',
    earned: subOk ? MAX.subtype : 0,
    max: MAX.subtype,
    notes: [
      subOk
        ? `鑑別も正しく絞れています：${SUBTYPE_LABEL.get(c.subtype) ?? c.subtype}`
        : `鑑別の正解：${SUBTYPE_LABEL.get(c.subtype) ?? c.subtype}${s.subtypeAnswer ? `（あなたの選択：${SUBTYPE_LABEL.get(s.subtypeAnswer) ?? s.subtypeAnswer}）` : ''}`,
    ],
  })

  // ── HOWTO 4条件
  const criteriaAssessed = did('im_criteria')
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

  // ── 画像検査：撮るか、撮るならCTかMRIか
  const tookCt = did('im_ct')
  const tookMri = did('im_mri')
  const tookAny = tookCt || tookMri
  let imagingEarned = 0
  const imagingNotes: string[] = []

  if (c.mriContraindicated && tookMri) {
    imagingEarned = 0
    imagingNotes.push(`この患者にMRIは禁忌です。${c.mriContraindicated}`)
    deductions.push({
      label: '頭部MRIを撮る',
      points: -30,
      reason: `MRI禁忌の患者に撮影を指示している。${c.mriContraindicated}`,
    })
  } else if (c.imagingIndicated) {
    if (!tookAny) {
      imagingEarned = 0
      imagingNotes.push(
        `この症例では画像検査が必要でした（${c.imagingPreferred === 'ct' ? '頭部CT' : '頭部MRI'}）`,
      )
      deductions.push({ label: '画像を撮らなかった', points: -10, reason: '中枢性を疑う所見が揃っており、画像検査が必要でした' })
    } else if ((c.imagingPreferred === 'ct' && tookCt) || (c.imagingPreferred === 'mri' && tookMri)) {
      imagingEarned = MAX.imaging
      imagingNotes.push(
        c.imagingPreferred === 'ct'
          ? '第一選択としてCTを選べています'
          : '画像検査の適応とMRIの選択、いずれも正しく判断しています',
      )
    } else {
      imagingEarned = Math.round(MAX.imaging / 2)
      imagingNotes.push(
        c.imagingPreferred === 'ct'
          ? 'この症例の第一選択はCTでした'
          : 'この症例の第一選択はMRIでした',
      )
    }
  } else {
    // 撮る必要がない症例
    if (!tookAny) {
      imagingEarned = MAX.imaging
      imagingNotes.push('所見が典型的であり、画像検査が不要な症例と正しく判断しています')
    } else if (c.imagingOptional) {
      imagingEarned = MAX.imaging
      imagingNotes.push('必須ではありませんが、中枢性を除外するために画像を撮る判断は妥当です')
    } else {
      imagingEarned = Math.round(MAX.imaging / 2)
      imagingNotes.push('所見が典型的であり、この症例で画像検査は不要でした')
      deductions.push({
        label: tookMri ? '頭部MRIを撮る' : '頭部CTを撮る',
        points: -3,
        reason: '所見が典型的であり画像検査は不要でした',
      })
    }
  }
  lines.push({ label: '画像検査の判断', earned: imagingEarned, max: MAX.imaging, notes: imagingNotes })

  // ── 診断
  const dxCorrect = s.diagnosisAnswer === c.diagnosis.correct
  const sideAsked = asksSide(c.diagnosis.correct)
  const sideCorrect = !sideAsked || s.sideAnswer === c.diagnosis.side
  lines.push({
    label: '診断',
    earned: dxCorrect ? MAX.diagnosis : 0,
    max: MAX.diagnosis,
    notes: [
      dxCorrect ? `正解：${c.diagnosis.correct}` : `あなたの診断：${s.diagnosisAnswer ?? '未回答'} ／ 正解：${c.diagnosis.correct}`,
    ],
  })
  if (sideAsked) {
    lines.push({
      label: '患側',
      earned: dxCorrect && sideCorrect ? MAX.side : 0,
      max: MAX.side,
      notes: [sideCorrect ? '患側も正しく判定できています' : `患側の正解：${c.diagnosis.side === 'R' ? '右' : '左'}`],
    })
  }

  // ── 耳石置換法
  const attempt = s.maneuver
  if (c.maneuver) {
    const kindOk = attempt?.kind === c.maneuver.kind
    const sideOk = attempt?.side === c.maneuver.side
    const perfect = Boolean(attempt?.perfect) && kindOk && sideOk
    const correctLabel = `${MANEUVER_KINDS.find((m) => m.id === c.maneuver!.kind)?.label}（${c.maneuver.side === 'R' ? '右' : '左'}）`
    lines.push({
      label: '耳石置換法',
      earned: perfect ? MAX.maneuver : kindOk && sideOk ? Math.round(MAX.maneuver / 2) : 0,
      max: MAX.maneuver,
      notes: [
        !attempt
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
  } else if (attempt) {
    deductions.push({ label: '耳石置換法', points: -10, reason: 'この症例に耳石置換法の適応はありません' })
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

  // ── 失調グレードの振り返り（採点はしないが講評で必ず触れる）
  if (!did('ex_ataxia')) {
    deductions.push({
      label: '起立・歩行を診ていない',
      points: -8,
      reason: '起立歩行の失調グレードを評価していません。HOWTOの通り、起立歩行は指鼻試験より感度の高い診察です',
    })
  }

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

export { ATAXIA_GRADES }
