<template>
  <header>
    <!-- ======================= ヘッダー ======================= -->
    <div class="header-container">
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
        <button style="line-height:20px;" @click="logout" v-if="uname">Logout</button>
        <button v-show="isRoomPage || isRoot" @click="showModal = !showModal">Description</button>
      </div>
    </div>
    <!-- ======================= 説明modal ======================= -->
    <vue-final-modal v-model="showModal" classes="modal-container" content-class="modal-content">
      <button class="modal__close" @click="showModal = false">
        <font-awesome-icon :icon="['fas', 'window-close']" />
      </button>

      <span class="modal__title">Description</span>
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
      return String(this.$route.path).match(/^\/rooms(\/)*[A-Za-z0-9]*.*/)
    },
    isRoot() {
      return String(this.$route.path).match(/^\/$/)
    },
    isRegisterPage() {
      return String(this.$route.path).match(/^\/register(\/)*[A-Za-z0-9]*.*/)
    },
    mdFile() {
      return mdFile
    },
  },
  methods: {
    ...mapActions('user', ['logout', 'setLoginUser', 'deleteLoginUser']),
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
$orange: hsl(20, 70%, 60%);

// ヘッダー部
.header-container {
  position: fixed;
  display: flex;
  width: 100%;
  min-height: 80px;
  background: rgba($basic, 0.7);
  z-index: 10;
}
//タイトル
h1 {
  @media (max-width: 740px) {
    display: none;
  }
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: auto;
  text-shadow: 2px 0 0 black, 0 2px 0 black, -2px 0 0 black, 0 -2px 0 black;
}
.left-block {
  display: flex;
  margin-right: auto;
  width: 300px;
  p {
    margin: auto;
    margin-left: 30px;
    line-height: 80px;
  }
  a {
    > p {
      color: $orange;
    }
  }
  @media (max-width: 740px) {
    > p {
      display: none;
    }
  }
}
.right-block {
  display: flex;
  margin-left: auto;
  button {
    height: 40px;
    padding: 10px;
    margin: auto 10px;
    border: 1px solid $orange;
  }
  p {
    @media (max-width: 1070px) {
      display: none;
    }
    margin: auto 20px;
    line-height: 80px;
  }
}

//モーダル
svg {
  color: $orange;
}
::v-deep .modal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: auto;
  //✗ボタン
  button {
    font-size: 30px;
    margin-left: 50px;
    border: none;
    margin: 0;
  }
}
//モーダル外形
::v-deep .modal-content {
  h1,
  h2,
  h3,
  p,
  li,
  span {
    font-family: sans-serif;
  }
  span {
    color: $orange;
  }
  padding: 20px 50px !important;
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
