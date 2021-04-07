export const state = () => ({
  login_user: null,
})

export const getters = {
  uname: state => (state.login_user ? state.login_user.name : null),
  uid: state => (state.login_user ? state.login_user.uid : null),
}

export const mutations = {
  // ユーザー情報 追加・削除
  setLoginUser(state, user) {
    state.login_user = user
  },
  deleteLoginUser(state) {
    state.login_user = null
  },
}

export const actions = {
  // common functions//
  // ユーザー情報取得
  // registerで登録したnameをfirestoreから取得
  setLoginUser({ commit }, user) {
    this.$firestore
      .doc(`users/${user.uid}`)
      .get()
      .then(doc => {
        commit('setLoginUser', { ...user, name: doc.data().name })
      })
  },
  // 削除
  deleteLoginUser({ commit }) {
    commit('deleteLoginUser')
  },

  // Authentication//
  // email&passwordでサインアップ
  async signup({ commit }, { email, password }) {
    try {
      await this.$fireAuth.createUserWithEmailAndPassword(email, password)
      this.$router.push('/'), location.reload()
    } catch (e) {
      alert(e.message)
    }
  },
  // emailログイン
  async emailLogin({ commit }, { email, password }) {
    try {
      await this.$fireAuth.signInWithEmailAndPassword(email, password)
      this.$router.push('/'), location.reload()
    } catch (e) {
      alert(e.message)
    }
  },
  // googleログイン
  async googleLogin() {
    try {
      const provider = new this.$firebase.auth.GoogleAuthProvider()
      await this.$fireAuth.signInWithPopup(provider)
      this.$router.push('/'), location.reload()
    } catch (e) {
      alert(e.message)
    }
  },
  // ログアウト
  async logout() {
    try {
      await this.$fireAuth.signOut()
      this.$router.push('/'), location.reload()
    } catch (e) {
      alert(e.message)
    }
  },
}
