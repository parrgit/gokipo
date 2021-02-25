export const state = () => ({
  roomInfo: {},
  progress: {},
  penalty: [], //TODOカード配布 実装時に考える
  players: [], //TODOburdenまだ
})

export const getters = {
  roomName: state => state.roomInfo.name,
  phase: state => state.progress.phase,
  players: state => state.players,
}

export const mutations = {
  addRoomInfo(state, roomInfo) {
    state.roomInfo = roomInfo
  },
  addProgress(state, progress) {
    state.progress = progress
  },
  addPlayer(state, player) {
    state.players.push(player)
  },
  resetPlayers(state) {
    state.players = []
  },
}

export const actions = {
  fetchBasics({ commit }, roomId) {
    //roomInfoをフェッチ
    this.$firestore.doc(`rooms/${roomId}`).onSnapshot(doc => {
      const roomInfo = {
        roomId: doc.id,
        ...doc.data(),
      }
      commit('addRoomInfo', roomInfo)
    })
    //progressをフェッチ
    this.$firestore.doc(`rooms/${roomId}/progress/progDoc`).onSnapshot(doc => {
      commit('addProgress', doc.data())
    })
    //playersの初期化、フェッチ
    this.$firestore.collection(`rooms/${roomId}/players`).onSnapshot(snapshot => {
      commit('resetPlayers')
      snapshot.forEach(doc => { 
        const player = {
          id: doc.id,
          ...doc.data(),
        }
        commit('addPlayer', player)
      })
    })
  },
}
