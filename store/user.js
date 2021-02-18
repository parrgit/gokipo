export const state = () => ({
  login_user: null,
})

export const getters = {
  uname: state => (state.login_user ? state.login_user.name : null),
  uid: state => (state.login_user ? state.login_user.uid : null),
}

export const mutations = {
  //ユーザー情報 追加・削除
  setLoginUser(state, user) {
    state.login_user = user
  },
  deleteLoginUser(state) {
    state.login_user = null
  },
}

export const actions = {
  //common functions//
  //ユーザー情報取得
  //registerで登録したnameをfirestoreから取得
  setLoginUser({ commit }, user) {
    this.$firestore
      .collection('users')
      .doc(user.uid)
      .get()
      .then(doc => {
        commit('setLoginUser', { ...user, name: doc.data().name })
      })
  },
  //削除
  deleteLoginUser({ commit }) {
    commit('deleteLoginUser')
  },
  //Authentication//
  //ログイン
  login() {
    const provider = new this.$firebase.auth.GoogleAuthProvider()
    this.$fireAuth.signInWithPopup(provider).then(() => {
      this.$router.push('/'), location.reload()
    })
  },
  //ログアウト
  logout() {
    this.$fireAuth.signOut().then(() => {
      this.$router.push('/'), location.reload()
    })
  },
}
