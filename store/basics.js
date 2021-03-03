export const state = () => ({
  roomInfo: {},
  progress: {},
  penalty: [], //TODOカード配布 実装時に考える
  players: [], //TODOburdenまだ
  hand: [], //TODO入れ込む
})

export const getters = {
  roomName: state => state.roomInfo.name,
  phase: state => state.progress.phase,
  players: state => state.players,
  hand: state => state.hand,
  progress: state => state.progress,
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
  addCard(state, card) {
    state.hand.push(card)
  },
  resetPlayers(state) {
    state.players = []
  },
  resetHand(state) {
    state.hand = []
  },
}

export const actions = {
  fetchBasics({ commit }, { roomId, uid }) {
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
    //【自分の】handの初期化、フェッチ
    this.$firestore
      .collection(`rooms/${roomId}/invPlayers/${uid}/hand`)
      .orderBy('species')
      .onSnapshot(col => {
        commit('resetHand')
        col.forEach(doc => {
          const card = {
            id: doc.id,
            type: doc.data().type,
            species: doc.data().species,
          }
          commit('addCard', card)
        })
      })
  },
}
