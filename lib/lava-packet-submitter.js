/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/




module.exports = class LavaPacketSubmitter  {

  constructor( web3, relayConfig ) {
    this.web3=web3;
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


    //need a methods that gets # of pending packets
    var relayedPacketsData = await this.getPacketRelayStats();

    //if a packet is not pending right now ....
    if(relayedPacketsData.packetsPending == 0)
    {

      var lavaPackets = await this.redisInterface.getResultsOfKeyInRedis('lavapacket')

      for(var i in lavaPackets)
      {
        var signature = lavaPackets[i];

         var packetDataJSON = await this.redisInterface.findHashInRedis('lavapacket',signature);
         var packetData = JSON.parse(packetDataJSON)

         //if packet is worthy of submitting ....
         if(this.packetIsAttractiveToSubmit(packetData))
         {
           await this.submitNewLavaPacket(packetData)
         }

       }


    }




    setTimeout(function(){self.pollLavaPacketsToSubmit()},10*1000);
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

  }

  async submitNewLavaPacket(packetData)
  {

  }


}
