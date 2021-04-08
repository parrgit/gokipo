export const state = () => ({
  roomInfo: {},
  progress: {},
  penaltyTop: {},
  players: [],
  hand: [],
  secretReal: {},
  isOnlineArr: {},
})

export const getters = {
  roomName: state => state.roomInfo.name,
  phase: state => state.progress.phase,
  players: state => state.players,
  hand: state => state.hand,
  progress: state => state.progress,
  penaltyTop: state => state.penaltyTop,
  secretReal: state => state.secretReal,
  isOnlineArr: state => state.isOnlineArr,
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
  //体感速度高速化用
  changePhase(state, phase) {
    if (state.progress) state.progress.phase = phase
  },

  //players.stateにonline/offlineを保存
  addIsOnline(state, data) {
    data.forEach(player => {
      state.isOnlineArr[player.id] = player.data().internet === 'online'
    })
  },

  addBurden(state, playerDash) {
    const obj = {} //ber:[], giz:[]..
    const species = ['ber', 'gzd', 'lvr', 'mon', 'nbs', 'sal', 'srp']
    const index = state.players.findIndex(player => {
      return player.id === playerDash.id
    })
    species.forEach(species => {
      //ber:[]
      const array = playerDash.burden.filter(card => {
        return card.species === species
      })
      obj[species] = array
    })
    state.players[index].burden = obj
  },

  addSecretReal(state, secretReal) {
    state.secretReal = secretReal
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
    const roomRef = this.$firestore.doc(`/rooms/${roomId}`)
    const progressRef = this.$firestore.doc(`/rooms/${roomId}/progress/progDoc`)
    const playersRef = this.$firestore.collection(`/rooms/${roomId}/players`)
    const invPlayerRef = this.$firestore.doc(`/rooms/${roomId}/invPlayers/${uid}`)
    const handRef = this.$firestore.collection(`/rooms/${roomId}/invPlayers/${uid}/hand`)
    const penaltyTopRef = this.$firestore.doc(`/rooms/${roomId}/penaltyTop/penaDoc`)
    const statusRef = this.$firestore.collection('/status')

    //roomをフェッチ
    roomRef.onSnapshot(doc => {
      const roomInfo = {
        roomId: doc.id,
        ...doc.data(),
      }
      commit('addRoomInfo', roomInfo)
    })
    // playersをフェッチ
    // players.burdenをフェッチ
    playersRef.onSnapshot(async snapshot => {
      commit('resetPlayers')
      snapshot.forEach(async doc => {
        //player[]に保存
        const player = {
          id: doc.id,
          ...doc.data(),
        }
        commit('addPlayer', player)
        commit('addBurden', player)
      })
    })
    //progressをフェッチ
    progressRef.onSnapshot(doc => {
      commit('addProgress', doc.data())
    })
    //【自分の】handの初期化、フェッチ
    handRef.orderBy('species').onSnapshot(col => {
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
    penaltyTopRef.onSnapshot(doc => {
      let penaltyTop = {}
      if (doc.data()) {
        penaltyTop = {
          id: doc.data().id,
          type: doc.data().type,
          species: doc.data().species,
          bodyNum: doc.data().bodyNum,
        }
      }
      commit('addPenaltyTop', penaltyTop)
    })

    //secretRealをフェッチ
    invPlayerRef.onSnapshot(doc => {
      if (!doc.data().secretReal) {
        const secretReal = {
          type: 'none',
          species: 'none',
        }
        commit('addSecretReal', secretReal)
      } else {
        const secretReal = doc.data().secretReal
        commit('addSecretReal', secretReal)
      }
    })

    //statusをフェッチ
    statusRef.onSnapshot(snapshot => {
      if (!snapshot.docs) return
      commit('addIsOnline', snapshot.docs)
    })
  },
}
