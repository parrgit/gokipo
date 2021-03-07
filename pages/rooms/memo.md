<div class="game-table">
        <button
          v-for="player in inPlayers"
          :key="player.id"
          @click="selectAcceptor(player.id)"
          :class="['player', { me: player.id === uid }]"
          :disabled="player.id === uid"
        >
          <!-- <p>id: {{ player.id }}</p> -->
          <p>name: {{ player.name }}</p>
          <p :class="{ isActive: player.isReady }">isReady: {{ player.isReady }}</p>
          <p :class="{ isActive: player.isAcceptor }">isAcceptor: {{ player.isAcceptor }}</p>
          <p :class="{ isActive: player.isYesNoer }">isYesNoer: {{ player.isYesNoer }}</p>
          <p :class="{ isActive: player.isGiver }">isGiver: {{ player.isGiver }}</p>
          <p :class="{ isActive: !player.canbeNominated }">
            canbeNominated: {{ player.canbeNominated }}
          </p>
          <!-- <p>isLoser: {{ player.isLoser }}</p> -->
          <p>handNum: {{ player.handNum }}</p>
          <p>burden</p>
          <p>{{ speciesOfBurden(player.burden) }}</p>
        </button>
      </div>




    // playersの初期化、フェッチ players{}Ver
    await playersCol.onSnapshot(async snapshot => {
      const playerIds = []
      const players = {}
      commit('resetPlayers')
      await snapshot.forEach(async doc => {
        playerIds.push(doc.id)
        //player[]に保存
        const player = {
          ...doc.data(),
        }
        players[doc.id] = player
      })
      playerIds.forEach(async playerId => {
        const burden = []
        const playersBurdenCol = this.$firestore.collection(
          `rooms/${roomId}/players/${playerId}/burden`
        )
        await playersBurdenCol.get().then(col => {
          col.docs.forEach(doc => {
            const burdenCard = {
              id: doc.id,
              type: doc.data().type,
              species: doc.data().species,
            }
            burden.push(burdenCard)
          })
        })
        players[playerId].burden = burden
      })
      commit('addPlayer', players)
    })