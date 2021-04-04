export const state = () => ({
  roomInfo: {},
  progress: {},
  penaltyTop: {},
  players: [],
  hand: [],
  secretReal: {},
})

export const getters = {
  roomName: state => state.roomInfo.name,
  phase: state => state.progress.phase,
  players: state => state.players,
  hand: state => state.hand,
  progress: state => state.progress,
  penaltyTop: state => state.penaltyTop,
  secretReal: state => state.secretReal,
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
    const roomDoc = this.$firestore.doc(`rooms/${roomId}`)
    const progressDoc = this.$firestore.doc(`rooms/${roomId}/progress/progDoc`)
    const playersCol = this.$firestore.collection(`rooms/${roomId}/players`)
    const invPlayerDoc = this.$firestore.doc(`rooms/${roomId}/invPlayers/${uid}`)
    const handCol = this.$firestore.collection(`rooms/${roomId}/invPlayers/${uid}/hand`)
    const penaltyTopDoc = this.$firestore.doc(`rooms/${roomId}/penaltyTop/penaDoc`)

    //TODODoc->Refの方が可読性up
    //roomをフェッチ
    roomDoc.onSnapshot(doc => {
      const roomInfo = {
        roomId: doc.id,
        ...doc.data(),
      }
      commit('addRoomInfo', roomInfo)
    })
    // playersをフェッチ
    // players.burdenをフェッチ
    playersCol.onSnapshot(async snapshot => {
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
    progressDoc.onSnapshot(doc => {
      commit('addProgress', doc.data())
    })
    //【自分の】handの初期化、フェッチ
    handCol.orderBy('species').onSnapshot(col => {
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
    penaltyTopDoc.onSnapshot(doc => {
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
    invPlayerDoc.onSnapshot(doc => {
      if (!doc.data().secretReal) {
        return
      }
      const secretReal = doc.data().secretReal
      commit('addSecretReal', secretReal)
    })
  },
}
