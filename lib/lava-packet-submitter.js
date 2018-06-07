/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/

const Tx = require('ethereumjs-tx')
const ContractInterface = require('./contract-interface')


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
           await self.broadcastLavaPacket(packetData);
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

  async broadcastLavaPacket(packetData)
  {
    console.log('broadcast lava packet ', packetData.signature);

    console.log(walletContract.address)

    var walletContract = ContractInterface.getWalletContract(this.web3,this.relayConfig.environment);

    var addressFrom = this.getRelayAccount().address;
    var addressTo = walletContract.address;

    var lavaTransferMethod = walletContract.transferTokensFromWithSignature(
      packetData.from,
      packetData.to,
      packetData.tokenAddress,
      packetData.tokenAmount,
      packetData.relayerReward,
      packetData.expires,
      packetData.nonce,
      packetData.signature
    );

    try{
      var txCount = await this.web3.eth.getTransactionCount(addressFrom);
      console.log('txCount',txCount)
     } catch(error) {  //here goes if someAsyncPromise() rejected}
      console.log('error',error);
       return error;    //this will result in a resolved promise.
     }

     var txData = this.web3.eth.abi.encodeFunctionCall({
             name: 'transferTokensFromWithSignature',
             type: 'function',
             "inputs": [
               {
                 "name": "from",
                 "type": "address"
               },
               {
                 "name": "to",
                 "type": "address"
               },
               {
                 "name": "token",
                 "type": "address"
               },
               {
                 "name": "tokens",
                 "type": "uint256"
               },
               {
                 "name": "relayerReward",
                 "type": "uint256"
               },
               {
                 "name": "expires",
                 "type": "uint256"
               },
               {
                 "name": "nonce",
                 "type": "uint256"
               },
               {
                 "name": "signature",
                 "type": "bytes"
               }
             ]
         }, [
             packetData.from,
             packetData.to,
             packetData.tokenAddress,
             packetData.tokenAmount,
             packetData.relayerReward,
             packetData.expires,
             packetData.nonce,
             packetData.signature
       ]);


     var max_gas_cost = 1704624;
     var estimatedGasCost = await lavaTransferMethod.estimateGas({gas: max_gas_cost, from:addressFrom, to: addressTo });

     if( estimatedGasCost > max_gas_cost){
       console.log("Gas estimate too high!  Something went wrong ")
       return;
     }

     const txOptions = {
       nonce: web3Utils.toHex(txCount),
       gas: web3Utils.toHex(estimatedGasCost),
       gasPrice: web3Utils.toHex(web3Utils.toWei(this.poolConfig.solutionGasPriceWei.toString(), 'gwei') ),
       value: 0,
       to: addressTo,
       from: addressFrom,
       data: txData
     }

     var privateKey =  this.getRelayAccount().privateKey;

     return new Promise(function (result,error) {

          this.sendSignedRawTransaction(this.web3,txOptions,addressFrom,privateKey, function(err, res) {
           if (err) error(err)
             result(res)
         })

       }.bind(this));

  //  var burned = await walletContract.signatureBurned.call(packetData.signature)



    // drop from queued packets  -- handle this like tokenpool   -- need a way to rebroadcast

  }



  async getRelayAccount()
  {
    return this.accountConfig;
  }

}
