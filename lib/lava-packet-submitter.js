/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/

const Tx = require('ethereumjs-tx')
const ContractInterface = require('./contract-interface')

var web3utils =  require('web3-utils');

module.exports = class LavaPacketSubmitter  {

  constructor( web3, lavaPeer, relayConfig, accountConfig, redisInterface ) {
    this.web3=web3;
    this.lavaPeer = lavaPeer;

    this.relayConfig=relayConfig;
    this.accountConfig=accountConfig;
    this.redisInterface = redisInterface;


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

      var lavaPackets = await self.redisInterface.getResultsOfKeyInRedis('queued_tx')

      console.log('packets',lavaPackets)

      //sort packets by attractiveness

      //lavaPackets, sort from highest score to lowest
      lavaPackets.sort(function(a, b) {
        return self.getLavaScore(b) - self.getLavaScore(a);
      });


      packetloop:
      for(var i in lavaPackets)
      {
        var signature = lavaPackets[i];

        console.log('the signature of this lavapacket is ', signature)

         var packetDataJSON = await self.redisInterface.findHashInRedis('queued_tx',signature);
         var packetData = JSON.parse(packetDataJSON)

         var broadcastedPacketDataJSON = await self.redisInterface.findHashInRedis('lavapacket_broadcasted',signature);


         var packetIsAttractive = await self.packetIsAttractiveToSubmit(packetData);
         var packetWasBroadcasted = (broadcastedPacketDataJSON != null)
         //if packet is worthy of submitting ....
         if(packetIsAttractive && !packetWasBroadcasted)
         {
           // set it to pending

            console.log('packet is attractive!', packetData)

           var txdataJSON = await this.redisInterface.findHashInRedis('lavapacket_txdata',signature)
           var txdata  = JSON.parse(txdataJSON)
           txdata.pending = true;
           txdata.queued = false;
           await this.redisInterface.storeRedisHashData('lavapacket_txdata',signature,JSON.stringify(txdata))
           await this.redisInterface.storeRedisHashData('lavapacket_broadcasted',signature,JSON.stringify(packetData))
           await this.redisInterface.deleteHashInRedis('queued_tx',signature)

             try{
               await self.broadcastLavaPacket(packetData);
             }catch(err)
             {
               console.error(err);
             }

           break packetloop;
         }else{
            await this.redisInterface.deleteHashInRedis('queued_tx',signature)
            console.log('packet is not attractive, removing from queued', packetData)
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
    var activeTransactions = await this.redisInterface.getResultsOfKeyInRedis('lavapacket_txdata')

    var ethereumTransactions = [];

    for(var i in activeTransactions){
      var hash = activeTransactions[i];
    //  console.log( 'hash',hash)
      ethereumTransactions.push( await this.redisInterface.findHashInRedis('lavapacket_txdata',hash) )
    }

    ethereumTransactions.map(function(receiptData){

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

    var relayData = await this.lavaPeer.getRelayData();

    var targetSafeLowRewardTokens =   (relayData.targetSafeLowRewardTokens) ;

    if(targetSafeLowRewardTokens <= 0 )
    {
      return false;
    }

    console.log('target safe low tokens', targetSafeLowRewardTokens)

            //use the decimals of the token .. not always 8!
    var targetSafeLowRewardSatoastis =  (targetSafeLowRewardTokens * (10**8) );
    // 0.0086
    console.log('target safe low satoastis', targetSafeLowRewardSatoastis)

    console.log('relayer reward', parseInt(packetData.relayerReward))

    return ( parseInt(packetData.relayerReward) >= targetSafeLowRewardSatoastis ) ;

  }

  async broadcastLavaPacket(packetData)
  {
    console.log('broadcast lava packet ', packetData.signature);


    var walletContract = ContractInterface.getWalletContract(this.web3,this.relayConfig.environment);

    console.log(walletContract.options.address) //undefined


    var addressFrom = this.getRelayAccount().address;
    var addressTo = walletContract.options.address;


    console.log('addressFrom ! ',addressFrom)

    console.log('meep ! ',packetData)

    try{
      var lavaTransferMethod = walletContract.methods.transferTokensFromWithSignature(
        packetData.from,
        packetData.to,
        packetData.tokenAddress,
        packetData.tokenAmount,
        packetData.relayerReward,
        packetData.expires,
        packetData.nonce,
        packetData.signature
      );
    }catch(e)
    {
      console.error(e)
    }




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


       console.log('estimating gas ')


     var max_gas_cost = 7046240;
     var estimatedGasCost = await lavaTransferMethod.estimateGas({gas: max_gas_cost, from:addressFrom, to: addressTo });

     if( estimatedGasCost > max_gas_cost){
       console.log("Gas estimate too high!  Something went wrong ")
       return;
     }

     console.log('estimated gas ', estimatedGasCost)



      var relayData = await this.lavaPeer.getRelayData();


     var relayingGasPrice = relayData.ethGasSafeLow; //this.relayConfig.solutionGasPriceWei
     //safelow ?
      console.log('relayingGasPrice ', relayingGasPrice)

     const txOptions = {
       nonce: web3utils.toHex(txCount),
       gas: web3utils.toHex(estimatedGasCost),
       gasPrice: web3utils.toHex(web3utils.toWei(relayingGasPrice.toString(), 'gwei') ),
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

  async sendSignedRawTransaction(web3,txOptions,addressFrom,private_key,callback) {

    var privKey = this.truncate0xFromString( private_key )

    const privateKey = new Buffer( privKey, 'hex')
    const transaction = new Tx(txOptions)


    transaction.sign(privateKey)


    const serializedTx = transaction.serialize().toString('hex')

      try
      {
        var result =  web3.eth.sendSignedTransaction('0x' + serializedTx, callback)
      }catch(e)
      {
        console.log('error',e);
      }
  }




       truncate0xFromString(s)
      {
        if(s.startsWith('0x')){
          return s.substring(2);
        }
        return s;
      }


  getRelayAccount()
  {
    return this.accountConfig;
  }

}
