export const state = () => ({
  roomInfo: {},
  progress: {},
  penaltyTop: {},
  penaltyBody: null, //TODO残り枚数
  players: [],
  hand: [],
})

export const getters = {
  roomName: state => state.roomInfo.name,
  phase: state => state.progress.phase,
  players: state => state.players,
  hand: state => state.hand,
  progress: state => state.progress,
  penaltyTop: state => state.penaltyTop,
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
  addPenaltyTop(state, penaltyTop) {
    state.penaltyTop = penaltyTop
  },
  addBurden(state, data) {
    const index = state.players.findIndex(player => {
      return player.id === data.playerId
    })
    state.players[index].burden.push(data.card)
  },
  resetPlayers(state) {
    state.players = []
  },
  resetHand(state) {
    state.hand = []
  },
  resetPlayersBurden(state) {
    state.players.forEach(player => {
      player.burden = []
    })
  },
}

export const actions = {
  async fetchBasics({ commit }, { roomId, uid }) {
    const roomDoc = this.$firestore.doc(`rooms/${roomId}`)
    const progressDoc = this.$firestore.doc(`rooms/${roomId}/progress/progDoc`)
    const playersCol = this.$firestore.collection(`rooms/${roomId}/players`)
    const handCol = this.$firestore.collection(`rooms/${roomId}/invPlayers/${uid}/hand`)
    const penaltyTopDoc = this.$firestore.doc(`rooms/${roomId}/penaltyTop/penaDoc`)

    //roomをフェッチ
    await roomDoc.onSnapshot(doc => {
      const roomInfo = {
        roomId: doc.id,
        ...doc.data(),
      }
      commit('addRoomInfo', roomInfo)
    })
    // playersの初期化、フェッチ（stateにプッシュするVer)
    await playersCol.onSnapshot(async snapshot => {
      commit('resetPlayers')
      snapshot.forEach(async doc => {
        //player[]に保存
        const player = {
          id: doc.id,
          ...doc.data(),
        }
        commit('addPlayer', player)
      })
    })
    //progressをフェッチ
    await progressDoc.onSnapshot(doc => {
      commit('addProgress', doc.data())
    })
    //【自分の】handの初期化、フェッチ
    await handCol.orderBy('species').onSnapshot(col => {
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
    //penaltyをフェッチ
    await penaltyTopDoc.onSnapshot(doc => {
      const penaltyTop = {
        id: doc.data().id,
        type: doc.data().type,
        species: doc.data().species,
      }
      commit('addPenaltyTop', penaltyTop)
    })
  },
  // async fetchBurdens({ dispatch }, { roomId, uid }) {
  //   const playersCol = this.$firestore.collection(`rooms/${roomId}/players`)
  //   playersCol.get().then(pCol => {
  //     pCol.forEach(async pDoc => {
  //       const playersBurdenCol = this.$firestore.collection(
  //         `rooms/${roomId}/players/${pDoc.id}/burden`
  //       )
  //       await playersBurdenCol.onSnapshot(burCol => {
  //         burCol.forEach(burDoc => {
  //           dispatch('fetchBasics', { roomId: roomId, uid: uid })
  //         })
  //       })
  //     })
  //   })
  // },
}
