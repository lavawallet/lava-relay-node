/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/




module.exports = class LavaPacketSubmitter  {

  constructor( web3, lavaPeer, relayConfig, redisInterface ) {
    this.web3=web3;
    this.lavaPeer = lavaPeer;
    this.redisInterface = redisInterface;
    this.relayConfig=relayConfig;
  }


  //start tasks
  init() {
    var self = this;
    setTimeout(function(){self.pollLavaPacketsToSubmit()},0);
  }

  async pollLavaPacketsToSubmit()
  {
    console.log("poll packets to submit")

    var self = this;


    //need a methods that gets # of pending packets
    var relayedPacketsData = await this.getPacketRelayStats();

    console.log(relayedPacketsData)

    //if a packet is not pending right now ....
    if(relayedPacketsData.pendingCount == 0 /*&& relayedPacketsData.packetsQueued > 0 */)
    {
      var lavaPackets = [];

      var lavaPackets = await self.redisInterface.getResultsOfKeyInRedis('queued_tx')


      //sort packets by attractiveness

      //lavaPackets, sort from highest score to lowest
      lavaPackets.sort(function(a, b) {
        return self.getLavaScore(b) - self.getLavaScore(a);
      });


      packetloop:
      for(var i in lavaPackets)
      {
        var signature = lavaPackets[i];

         var packetDataJSON = await self.redisInterface.findHashInRedis('queued_tx',signature);
         var packetData = JSON.parse(packetDataJSON)

         //if packet is worthy of submitting ....
         if(self.packetIsAttractiveToSubmit(packetData))
         {
           await self.submitNewLavaPacket(packetData);
           break packetloop;
         }

       }


    }




    setTimeout(function(){self.pollLavaPacketsToSubmit()},10*1000);
  }


  //a score for how attractive a packet is to relay ...
  getLavaScore(lavaPacket)
  {
    return lavaPacket.relayerReward ;  //other factors ?
  }

  async getPacketRelayStats()
  {

    //var queuedCount = 0;
    var pendingCount = 0;
    var minedCount = 0;
    var successCount = 0;

    //var queuedTransactions = await this.redisInterface.getElementsOfListInRedis('queued_transactions')
    var activeTransactions = await this.redisInterface.getResultsOfKeyInRedis('active_transactions')

    var ethereumTransactions = [];

    for(i in activeTransactions){
      var hash = activeTransactions[i];
    //  console.log( 'hash',hash)
      ethereumTransactions.push( await this.redisInterface.findHashInRedis('active_transactions',hash) )
    }

    ethereumTransactions.map(function(item){

      var receiptData = item.receiptData;

      if(receiptData.pending)pendingCount++;
      if(receiptData.mined)minedCount++;
      if(receiptData.success)successCount++;

    });

    await this.redisInterface.storeRedisData('pendingTxCount',pendingCount);
    await this.redisInterface.storeRedisData('minedTxCount',minedCount);
    await this.redisInterface.storeRedisData('successTxCount',successCount);


    //number pending .. etc
    return {
      pendingCount: pendingCount,
      minedCount: minedCount,
      successCount: successCount
    }
  }

  async packetIsAttractiveToSubmit(packetData)
  {

    var relayData = this.lavaPeer.getRelayData();

    var targetSafeLowRewardTokens = relayData.targetSafeLowRewardTokens;

    return packetData.relayerReward > targetSafeLowRewardTokens ;

  }

  async submitNewLavaPacket(packetData)
  {
    console.log('submit new lava packet ');



    // drop from queued packets  -- handle this like tokenpool   -- need a way to rebroadcast
    
  }


}
