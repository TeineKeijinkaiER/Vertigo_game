import { Button, Win } from '../components/ui'

export function HowtoScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="stack grow scroll">
      <Win title="このゲームの目的">
        <p className="msg small" style={{ margin: 0 }}>
          救急外来でめまい患者を診るときの手順を身につけるためのゲームです。
          {'\n'}めまいは「どの検査をしたか」ではなく「何を診たか」で診断が決まります。
          自分でコマンドを選び、診察の順番ごと組み立てる練習をしてください。
        </p>
      </Win>
      <Win title="あそびかた">
        <p className="msg small" style={{ margin: 0 }}>
          1　コマンドを選んで問診・眼の診察・身体診察を行う
          {'\n'}2　「みたてる」で前庭症候の分類と鑑別を答える
          {'\n'}3　必要なら画像検査、適応があれば耳石置換法を行う
          {'\n'}4　診断名と患側を決める
          {'\n'}5　帰宅・入院・専門科コンサルトなど方針を決める
        </p>
      </Win>
      <Win title="てんすうのつきかた">
        <p className="msg small" style={{ margin: 0 }}>
          やらなかった診察の情報は最後まで得られません。
          {'\n'}不要な診察や検査をしても減点されません。
          {'\n'}ただし、禁忌にあたる方針は減点されます。
          {'\n'}起立・歩行の評価は指鼻試験より感度が高い診察です。省くと減点されます。
          {'\n'}最終評価でもGrade 2以上のふらつきが続く場合は、原則として画像検査が必要です。
        </p>
      </Win>
      <Win title="ランクとクリア">
        <p className="msg small" style={{ margin: 0 }}>
          S　95点以上
          {'\n'}A　85点以上
          {'\n'}B　70点以上
          {'\n'}C　50点以上
          {'\n'}D　50点未満
          {'\n'}
          {'\n'}A以上でその症例はクリアです。Sを取ると一覧に ☆ が付きます。
          成績は「きろく」、遊んだ記録は「りれき」で見られます。
        </p>
      </Win>
      <Win title="しょくぎょう と おくられるデータ">
        <p className="msg small" style={{ margin: 0 }}>
          学習状況を集計するため、症例を解き終えるたびに
          <span className="accent">職業と成績</span>を送信します。
          {'\n'}氏名・端末の情報・メールアドレスなど、
          <span className="accent">個人を特定する情報は一切送りません</span>。
          {'\n'}送信に失敗してもゲームは止まりません。
        </p>
      </Win>
      <Win title="めんせきじこう">
        <p className="msg small" style={{ margin: 0 }}>
          このゲームは医学教育を目的としたシミュレーションです。実際の患者さんの診断・治療を行う際は、所属施設の方針や最新のガイドラインに従い、必要に応じて専門家へ相談してください。
          {'\n'}このゲームの内容だけで実際の診療を判断しないでください。
        </p>
      </Win>
      <Win title="こうしんりれき">
        <p className="msg small dim" style={{ margin: 0 }}>
          ver 0.2　オープニングを3つの入口に整理。使い方・クリア記録・履歴・職種・BGMを追加。
          {'\n'}ver 0.1　12症例の診断トレーニングを公開。
        </p>
      </Win>
      <div className="grow" />
      <Button variant="primary" onClick={onClose}>
        とじる
      </Button>
    </div>
  )
}
