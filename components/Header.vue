<template>
  <header>
    <!-- ======================= ヘッダー ======================= -->
    <div v-if="isRoomPage" class="left-block">
      <nuxt-link to="/">
        <p>◁</p>
      </nuxt-link>
      <p>room: {{ roomName }}</p>
    </div>
    <h1>Purine</h1>
    <div class="right-block">
      <p v-if="uname">name: {{ uname }}</p>
      <!-- ログインしていない時に気づかせる -->
      <button style="line-height:50px;" @click="login" v-if="!uname">login</button>
      <button style="line-height:20px;" @click="logout" v-if="uname">logout</button>
      <button v-show="isRoomPage" @click="showModal = !showModal">description</button>
    </div>

    <!-- ======================= 説明modal ======================= -->
    <vue-final-modal v-model="showModal" classes="modal-container" content-class="modal-content">
      <button class="modal__close" @click="showModal = false">
        <font-awesome-icon :icon="['fas', 'window-close']" />
      </button>

      <span class="modal__title">ルール説明</span>
      <div class="modal__content">
        <div class="md-styles" v-html="mdFile"></div>
      </div>
    </vue-final-modal>
  </header>
</template>

<script>
import mdFile from '@/assets/description.md'

import { mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {
      showModal: false,
    }
  },
  computed: {
    ...mapGetters('basics', ['roomName']),
    ...mapGetters('user', ['uname']),
    isRoomPage() {
      return this.$route.path.match(/\/rooms\/[A-Za-z0-9]*/)
    },
    mdFile() {
      return mdFile
    },
  },
  methods: {
    ...mapActions('user', ['login', 'logout', 'setLoginUser', 'deleteLoginUser']),
  },
  async created() {
    const user = await this.$auth()
    if (!user) {
      this.deleteLoginUser()
    } else {
      //registerで登録した名前を取得
      const { uid, displayName } = user
      this.setLoginUser({ uid, displayName })
    }
  },
}
</script>

<style lang="scss" scoped>
@import '@/assets/css/markdown.scss';
$basic: #0f0e17;
$light: #fffffe;

h1 {
  text-align: center;
  display: block;
  margin: auto;
}
header {
  display: flex;
  justify-content: space-between;
}
.right-block {
  display: flex;
  button {
    padding: 5px;
    margin-left: 30px;
  }
}
.left-block {
  display: flex;
  > p {
    margin: auto;
    margin-left: 30px;
  }
}

//モーダル
::v-deep .modal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: auto;
  width: 1000px;
  //✗ボタン
  button {
    font-size: 30px;
    margin-left: 50px;
    border: none;
    margin: 0;
  }
}
::v-deep .modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90%;
  margin: 0 1rem;
  padding: 1rem;
  border: 1px solid $light;
  border-radius: 0.25rem;
  background: $basic;
}
.modal__title {
  margin: 0 2rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
}
.modal__content {
  flex-grow: 1;
  overflow-y: auto;
}
.modal__close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}
</style>
