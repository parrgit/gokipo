<template>
  <p>
    <span v-show="phase === 'waiting'">全員Readyでゲームが開始します</span>
    <span v-show="phase === 'give' && me.isGiver">
      出すカード、宣言、受け手を選択してgiveしてください
    </span>
    <span v-show="phase === 'give' && !me.isGiver">出し手がカードを提出しています</span>
    <span v-show="phase === 'accept' && me.isAcceptor">
      回答してください
    </span>
    <span v-show="phase === 'accept' && !me.isAcceptor">
      受け手が回答しています
    </span>
    <span v-show="phase === 'pass' && me.isGiver">
      宣言、受け手を選択してください<br />
      （既に受け手になっているプレイヤーは選択できません）
    </span>
    <span v-show="phase === 'pass' && !me.isGiver">
      出し手がカードを提出しようとしています
    </span>
    <span v-show="phase === 'yesno' && me.isYesNoer">
      yes/noを受け取ってしまいました。<br />
      出し手の宣言と同じカード1枚、<br />
      または宣言と違うカードで2枚溜めてください。
    </span>
    <span v-show="phase === 'yesno' && !me.isYesNoer">
      溜め手が溜めるカードを選択しています。
    </span>
  </p>
</template>

<script>
export default {
  props: ['phase', 'me'],
}
</script>
