import type { FilmId } from '../components/ManeuverFilm'
import type { PoseImageId } from './poseImages'
import type { NystagmusSpec } from './types'
import { case01 } from './cases/case01'
import { case02 } from './cases/case02'
import { case03 } from './cases/case03'
import { case04 } from './cases/case04'
import { case05 } from './cases/case05'
import { case12 } from './cases/case12'

export type BppvLessonId = 'pc_r' | 'pc_l' | 'hc_geo_r' | 'hc_geo_l' | 'hc_apo_r' | 'hc_apo_l'

type Finding = { label: string; film: FilmId; nystagmus: NystagmusSpec }

export interface BppvLesson {
  id: BppvLessonId
  family: '後半規管' | '水平半規管・向地性' | '水平半規管・背地性（クプラ結石）'
  side: '右' | '左'
  title: string
  summary: string
  testName: string
  findings: readonly Finding[]
  findingRule: string
  maneuverName: string
  maneuverFilm: FilmId
  maneuverCaption: string
  poses: readonly { id: PoseImageId; caption: string }[]
  steps: readonly string[]
  caution: string
}

const finding = (label: string, film: FilmId, nystagmus: NystagmusSpec): Finding => ({ label, film, nystagmus })

/**
 * BPPV学習画面の全6パターン。眼振specは対応するゲーム症例から再利用し、
 * 動画と静止画は public/poses の検証済みアセットだけを参照する。
 */
export const BPPV_LESSONS: readonly BppvLesson[] = [
  {
    id: 'pc_r', family: '後半規管', side: '右', title: '右後半規管BPPV（半規管結石症）',
    summary: '起き上がり、横になる、上を向くなど、頭を上下に動かすと短時間の回転性めまいが出ます。',
    testName: '右Dix-Hallpike',
    findings: [finding('右耳を下にした懸垂位', 'dix_hallpike_r', case01.nystagmus!.eye_dh_r!)],
    findingRule: '潜時をおいて上向き回旋眼振が出現します。回旋成分は患者から見て時計回り、右耳の方向です。',
    maneuverName: '右Epley法', maneuverFilm: 'epley_r',
    maneuverCaption: '頭部の回旋と体幹のログロールを分け、耳石を卵形嚢へ戻します。',
    poses: [{ id: 'dh_hang_r', caption: '右懸垂位' }, { id: 'ep_cross_r', caption: '頭を左へ90°' }, { id: 'side_l_facedown', caption: '左側臥位・鼻を床へ' }, { id: 'sit_up', caption: 'ゆっくり起坐' }],
    steps: ['右耳を下にした頭部懸垂位', '頭だけを左へ90°回す', '体ごと左側臥位にして鼻を床へ向ける', 'ゆっくり起坐させる'],
    caution: '頸椎疾患、可動域制限、血管病変などがある場合は無理に行わず、方法を調整します。',
  },
  {
    id: 'pc_l', family: '後半規管', side: '左', title: '左後半規管BPPV（半規管結石症）',
    summary: '頭の上下運動で誘発される、短時間で反復するめまいです。右と左右反転した所見と手技になります。',
    testName: '左Dix-Hallpike',
    findings: [finding('左耳を下にした懸垂位', 'dix_hallpike_l', case02.nystagmus!.eye_dh_l!)],
    findingRule: '潜時をおいて上向き回旋眼振が出現します。回旋成分は患者から見て反時計回り、左耳の方向です。',
    maneuverName: '左Epley法', maneuverFilm: 'epley_l',
    maneuverCaption: '右と反対方向に、頭部と体幹を順に動かします。',
    poses: [{ id: 'dh_hang_l', caption: '左懸垂位' }, { id: 'ep_cross_l', caption: '頭を右へ90°' }, { id: 'side_r_facedown', caption: '右側臥位・鼻を床へ' }, { id: 'sit_up', caption: 'ゆっくり起坐' }],
    steps: ['左耳を下にした頭部懸垂位', '頭だけを右へ90°回す', '体ごと右側臥位にして鼻を床へ向ける', 'ゆっくり起坐させる'],
    caution: '回旋眼振の向きは患者から見た向きです。画面上の左右と混同しないよう注意します。',
  },
  {
    id: 'hc_geo_r', family: '水平半規管・向地性', side: '右', title: '右水平半規管BPPV（向地性・半規管結石症）',
    summary: '寝返りで誘発され、両側で地に向かう水平眼振が出ます。患側を下にしたときに強くなります。',
    testName: 'Supine Head Roll',
    findings: [finding('右耳を下にする', 'headroll_r', case04.nystagmus!.eye_roll_r!), finding('左耳を下にする', 'headroll_l', case04.nystagmus!.eye_roll_l!)],
    findingRule: '向地性では眼振が下になった耳の方向へ向きます。強い右耳下が患側です。',
    maneuverName: '右Gufoni法（向地性）', maneuverFilm: 'gufoni_geo_r',
    maneuverCaption: '健側（左）へ倒し、鼻を床へ45°向けます。Lempert法も代替として行えます。',
    poses: [{ id: 'gufoni_fall_l', caption: '健側の左へ倒す' }, { id: 'side_l_facedown', caption: '鼻を床へ45°' }, { id: 'lempert_full', caption: '代替のLempert法' }],
    steps: ['坐位から健側（左）へすばやく倒す', '鼻を床へ45°向けて保持する', 'ゆっくり坐位へ戻す'],
    caution: 'Head Rollは左右とも行い、振幅・速度を比べます。片側だけでは患側を誤ります。',
  },
  {
    id: 'hc_geo_l', family: '水平半規管・向地性', side: '左', title: '左水平半規管BPPV（向地性・半規管結石症）',
    summary: '寝返りで誘発される水平半規管型です。左耳下で強い向地性眼振が出ます。',
    testName: 'Supine Head Roll',
    findings: [finding('右耳を下にする', 'headroll_r', case03.nystagmus!.eye_roll_r!), finding('左耳を下にする', 'headroll_l', case03.nystagmus!.eye_roll_l!)],
    findingRule: '向地性では、強い左耳下が患側です。眼振の向きは下になった耳へ向かいます。',
    maneuverName: '左Gufoni法（向地性）', maneuverFilm: 'gufoni_geo_l',
    maneuverCaption: '健側（右）へ倒し、鼻を床へ45°向けます。',
    poses: [{ id: 'gufoni_fall_r', caption: '健側の右へ倒す' }, { id: 'side_r_facedown', caption: '鼻を床へ45°' }, { id: 'lempert_full', caption: '代替のLempert法' }],
    steps: ['坐位から健側（右）へすばやく倒す', '鼻を床へ45°向けて保持する', 'ゆっくり坐位へ戻す'],
    caution: '向地性と背地性では、患側判定とGufoni法の倒す方向が反対です。',
  },
  {
    id: 'hc_apo_r', family: '水平半規管・背地性（クプラ結石）', side: '右', title: '右水平半規管BPPV（背地性・クプラ結石）',
    summary: '寝返りで誘発される持続の長い水平眼振です。クプラに付着した耳石を考えます。',
    testName: 'Supine Head Roll',
    findings: [finding('右耳を下にする', 'headroll_r', case12.nystagmus!.eye_roll_r!), finding('左耳を下にする', 'headroll_l', case12.nystagmus!.eye_roll_l!)],
    findingRule: '背地性では眼振が地と反対へ向きます。弱い右耳下が患側で、持続が長く疲労しにくいのが手がかりです。',
    maneuverName: '右Gufoni–Appiani法（背地性）', maneuverFilm: 'gufoni_apo_r',
    maneuverCaption: '患側（右）へ倒し、鼻を天井へ45°向けてクプラから耳石を外します。',
    poses: [{ id: 'gufoni_fall_r', caption: '患側の右へ倒す' }, { id: 'side_r_faceup', caption: '鼻を天井へ45°' }],
    steps: ['坐位から患側（右）へすばやく倒す', '鼻を天井へ45°向けて保持する', '向地性へ変われば、その型の手技を続ける'],
    caution: '背地性眼振は中枢性疾患でも起こり得ます。神経所見や歩行を必ず併せて評価します。',
  },
  {
    id: 'hc_apo_l', family: '水平半規管・背地性（クプラ結石）', side: '左', title: '左水平半規管BPPV（背地性・クプラ結石）',
    summary: '左右のHead Rollで背地性眼振を比べ、弱い側から患側を判断します。',
    testName: 'Supine Head Roll',
    findings: [finding('右耳を下にする', 'headroll_r', case05.nystagmus!.eye_roll_r!), finding('左耳を下にする', 'headroll_l', case05.nystagmus!.eye_roll_l!)],
    findingRule: '背地性では、弱い左耳下が患側です。向地性と逆のルールになります。',
    maneuverName: '左Gufoni–Appiani法（背地性）', maneuverFilm: 'gufoni_apo_l',
    maneuverCaption: '患側（左）へ倒し、鼻を天井へ45°向けます。',
    poses: [{ id: 'gufoni_fall_l', caption: '患側の左へ倒す' }, { id: 'side_l_faceup', caption: '鼻を天井へ45°' }],
    steps: ['坐位から患側（左）へすばやく倒す', '鼻を天井へ45°向けて保持する', '向地性へ変われば、その型の手技を続ける'],
    caution: '背地性水平眼振を末梢性と決めつけず、中枢性の赤旗を確認します。',
  },
]
