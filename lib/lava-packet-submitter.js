/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/

const Tx = require('ethereumjs-tx')
const ContractInterface = require('./contract-interface')


var lavaPacketUtils = require("./lava-packet-utils");

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

    setTimeout(function(){self.monitorPendingLavaPackets()},2000);
  }

  async pollLavaPacketsToSubmit()
  {
    console.log("poll packets to submit")

    var self = this;


    //need a methods that gets # of pending packets
    var relayedPacketsData = await this.getPacketRelayStats();
    console.log('getPacketRelayStats',relayedPacketsData)

    //if a packet is not pending right now ....
    if(relayedPacketsData.pendingCount == 0 )
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

         var txdataJSON = await this.redisInterface.findHashInRedis('lavapacket_txdata',signature)
         var txdata  = JSON.parse(txdataJSON)

         var broadcastedPacketDataJSON = await self.redisInterface.findHashInRedis('lavapacket_broadcasted',signature);


         var packetIsAttractiveStatus = await self.packetIsAttractiveToSubmit(packetData);
         var packetWasBroadcasted = (broadcastedPacketDataJSON != null)

         var packetWasBroadcastedRecently = false;

         if( packetWasBroadcasted   )
         {
           var broadcastedPacketData= JSON.parse(broadcastedPacketDataJSON)

           var currentEthBlock = await self.redisInterface.getEthBlockNumber();

           if( broadcastedPacketData.broadcastedAtBlock != null && ((currentEthBlock - broadcastedPacketData.broadcastedAtBlock) <= 500  )  )
           {
             packetWasBroadcastedRecently = true;
           }

         }


         //if packet is worthy of submitting ....
         if(  ( !packetWasBroadcastedRecently  ) && !txdata.pending)   // if not, ignore the packet
         {
           // set it to pending
           if(packetIsAttractiveStatus.attractive == true)  //if not , remove from queue
           {
                 console.log('packet is attractive!', packetData)

                 var broadcastingSpeed = 'normal';

                 if( packetIsAttractiveStatus.fast == true )
                 {
                  console.log('broadcasting tx fast !')
                  broadcastingSpeed = 'fast'
                 }

                 txdata.pending = true;
                 txdata.queued = false;
                  //await this.redisInterface.deleteHashInRedis('queued_tx',signature)






                   try{


                       var relayData = await this.lavaPeer.getRelayData();


                      var relayingGasPrice = relayData.ethGasNormal; //this.relayConfig.solutionGasPriceWei

                      if(broadcastingSpeed == 'fast')
                      {
                        relayingGasPrice = relayData.ethGasFast;
                      }

                       var txHash = await LavaPacketSubmitter.broadcastLavaPacket(packetData,broadcastingSpeed,relayingGasPrice,this.getRelayAccount(),this.web3,this.relayConfig.environment);

                   }catch(err)
                   {
                     console.log('error with broadcasting ')
                     console.error(err.name, err.message);

                     txdata.pending = false;
                     txdata.queued = false;
                     txdata.errored = true; //check for this and display on dashboard
                     txdata.errorMessage = err.message;
                     await this.redisInterface.deleteHashInRedis('queued_tx',signature)
                   }

                   var currentEthBlock = await self.redisInterface.getEthBlockNumber();

                   packetData.txHash = txHash;
                   packetData.broadcastedAtBlock = currentEthBlock;

                   await this.redisInterface.storeRedisHashData('lavapacket_txdata',signature,JSON.stringify(txdata))
                   await this.redisInterface.storeRedisHashData('lavapacket_broadcasted',signature,JSON.stringify(packetData))


                 break packetloop;
               }else{
                  await this.redisInterface.deleteHashInRedis('queued_tx',signature)
                  console.log('packet is not attractive, removing from queued', packetData)
               }

          }else {
            //packet was not broadcasted recently and is not pending

            if( packetWasBroadcasted )
            {
              //packet is lost
              txdata.queued = true;
              txdata.pending = false;

              await this.redisInterface.storeRedisHashData('lavapacket_txdata',signature,JSON.stringify(txdata))
              //await this.redisInterface.storeRedisHashData('lavapacket_broadcasted',signature,JSON.stringify(packetData))


            }

            console.log('what is this packet doing ', packetData, txdata)
          }

       }


    }




    setTimeout(function(){self.pollLavaPacketsToSubmit()},10*1000);
  }


  async monitorPendingLavaPackets()
  {
    console.log('monitor pending packets')

    var self = this;

    var relayedPacketsData = await this.getPacketRelayStats();

    var currentEthBlock = await self.redisInterface.getEthBlockNumber();

    //if a packet is not pending right now ....
    if(relayedPacketsData.pendingCount >= 1 )
    {

      var lavaPackets = await self.redisInterface.getResultsOfKeyInRedis('queued_tx')


      monitorloop:
      for(var i in lavaPackets)
      {
         var signature = lavaPackets[i];


         var packetDataJSON = await self.redisInterface.findHashInRedis('lavapacket_broadcasted',signature);
         var packetData = JSON.parse(packetDataJSON)


         var txdataJSON = await this.redisInterface.findHashInRedis('lavapacket_txdata',signature)
         var txdata  = JSON.parse(txdataJSON)

         var packetWasBroadcasted = (broadcastedPacketDataJSON != null)

         if(  packetWasBroadcasted && txdata.pending && packetData.txHash !=null)
         {
           //get mining receipt

           console.log('check if tx was mined ', packetData.txHash)

           var packetMiningStatus = await getPacketMiningStatus(packetData.txHash);

           if(packetMiningStatus.mined == true )
           {

             txdata.pending=false;
             txdata.mined=true;
             txdata.success=packetMiningStatus.success;
             await this.redisInterface.storeRedisHashData('lavapacket_txdata',signature,JSON.stringify(txdata))

             await this.redisInterface.deleteHashInRedis('queued_tx',signature)

             console.log('tx was mined', packetData.txHash )
           }else if(  packetData.ethBlockReceived  <  (currentEthBlock - 50 )  )
           {
             console.log('tx wasnt mined in 50 blocks, dropping ')
             txdata.pending=false;
             txdata.errored = true; //check for this and display on dashboard
             txdata.errorMessage = 'this packet wasnt mined in 50 blocks';
             await this.redisInterface.deleteHashInRedis('queued_tx',signature)


           }

           //else do nothing


         }

      }

    }



    setTimeout(function(){self.monitorPendingLavaPackets()},10*1000);
  }


  async getPacketMiningStatus(txHash)
  {
      var receipt = await this.requestTransactionReceipt(txHash,this.web3)


      var mined = (liveTransactionReceipt != null  )
      var success = false

      if( mined )
      {
          success =  ((liveTransactionReceipt.status == true)
                      || (web3Utils.hexToNumber( liveTransactionReceipt.status) == 1 ))
     }

     return {mined:mined,success:success}
  }


  static async requestTransactionReceipt(txHash,web3)
  {
       var receipt = await web3.eth.getTransactionReceipt(txHash);

       return receipt;
  }

  //a score for how attractive a packet is to relay ...
  getLavaScore(lavaPacket)
  {
    return lavaPacket.relayerReward ;  //other factors ?
  }

  //is this working ??
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
    var targetNormalRewardTokens =   (relayData.targetNormalRewardTokens) ;
    var targetFastRewardTokens =   (relayData.targetFastRewardTokens) ;

    if(targetSafeLowRewardTokens <= 0 || targetNormalRewardTokens <= 0 || targetFastRewardTokens <= 0 )
    {
      console.error('Missing targetRewardTokens from getRelayData()')
      return {attractive:false,fast:false};
    }

    console.log('target safe low tokens', targetSafeLowRewardTokens)
    console.log('target fast tokens', targetFastRewardTokens)

            //use the decimals of the token .. not always 8!
    var targetSafeLowRewardSatoastis =  (targetSafeLowRewardTokens * (10**8) );
    var targetNormalRewardSatoastis =  (targetNormalRewardTokens * (10**8) );
    var targetFastRewardSatoastis =  (targetFastRewardTokens * (10**8) );
    // 0.0086
    console.log('target safe low satoastis', targetSafeLowRewardSatoastis)
    console.log('target fast satoastis', targetFastRewardSatoastis)

    console.log('relayer reward', parseInt(packetData.relayerReward))

    var relayRewardAboveSafeLow = ( parseInt(packetData.relayerReward) >= targetSafeLowRewardSatoastis )
    var relayRewardAboveNormal = ( parseInt(packetData.relayerReward) >= targetNormalRewardSatoastis )
    var relayRewardAboveFast = ( parseInt(packetData.relayerReward) >= targetFastRewardSatoastis )

    //dont use safe low

    return {attractive: relayRewardAboveNormal, fast: relayRewardAboveFast } ;

  }

  static async broadcastLavaPacket(packetData,broadcastingSpeed,relayingGasPrice,relayAccount,web3,env)
  {
    console.log('broadcast lava packet ', packetData  );


    var lavaContract = ContractInterface.getLavaContract(web3,env);

    console.log(lavaContract.options.address) //undefined


    var addressFrom = relayAccount.address;
    var addressTo = lavaContract.options.address;


    console.log('addressFrom ! ',addressFrom, addressTo)



    var lavaTransferMethod = lavaPacketUtils.getContractLavaMethod(lavaContract,packetData)

    console.log('USING METHOD ', lavaTransferMethod)

    try{
      var txCount = await web3.eth.getTransactionCount(addressFrom);
      console.log('txCount',txCount)
     } catch(error) {  //here goes if someAsyncPromise() rejected}
      console.log('error',error);
       return error;    //this will result in a resolved promise.
     }

     //var txData = lavaPacketUtils.getFunctionCall(this.web3,packetData)




     var max_gas_cost = 704624;
     /*
     var estimatedGasCost = await lavaTransferMethod.estimateGas({gas: max_gas_cost, from:addressFrom, to: addressTo });

     if( estimatedGasCost > max_gas_cost){
       console.log("Gas estimate too high!  Something went wrong ")
       return;
     }

     console.log('estimated gas ', estimatedGasCost)

     */


       let encoded_tx = lavaTransferMethod.encodeABI();


     //safelow ?
      console.log('relayingGasPrice ', relayingGasPrice)

        console.log('max_gas_cost ', max_gas_cost)

       console.log('txCount ', txCount)
        console.log('addressFrom ', addressFrom)
         console.log('addressTo ', addressTo)
     /*const txOptions = {
       nonce: web3utils.toHex(txCount),
       gas: web3utils.toHex(estimatedGasCost),
       gasPrice: web3utils.toHex(web3utils.toWei(relayingGasPrice.toString(), 'gwei') ),
       value: 0,
       to: addressTo,
       from: addressFrom //,
      // data: txData
    }*/





      let txOptions = {
          nonce: web3utils.toHex(txCount),
          gas: web3utils.toHex(max_gas_cost),
          gasPrice: web3utils.toHex(web3utils.toWei(relayingGasPrice.toString(), 'gwei') ),
          data: encoded_tx,
          value:0,
          from: addressFrom,
          to: addressTo
      };


      /*
      let transactionObject = {
          nonce: web3utils.toHex(txCount),
          gas: web3utils.toHex(max_gas_cost),
          gasPrice: web3utils.toHex(web3utils.toWei(relayingGasPrice.toString(), 'gwei') ),
        //  data: 'encoded_tx',
          value: 0,
          from: addressFrom,
          to: 0x0000000000000000000000000000000000000000
      };
      */

      var pKey =  relayAccount.privateKey;

      console.log('SIGN WITH pkey',pKey)

    //  const privateKey = new Buffer( pKey, 'hex')

    //maybe something is wrong w pkey!?

       var tx = await this.sendSignedRawTransaction(web3,txOptions,addressFrom,pKey)

      return true;

/*
        web3.eth.accounts.signTransaction(transactionObject, pKey, function (error, signedTx) {
          if (error) {
              console.log('bleeping error1',error);
              // handle error
          } else {

            console.log('sending signed tx ! ')

            web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                    .on('receipt', function (receipt) {
                        //do something
                        console.log('broadcasted!',receipt)
                 });
          }
        });
*/

     /*var privateKey =  this.getRelayAccount().privateKey;

     return new Promise(function (result,error) {

          this.sendSignedRawTransaction(this.web3,txOptions,addressFrom,privateKey, function(err, res) {
           if (err) error(err)
             result(res)
         })

       }.bind(this));*/

  //  var burned = await lavaContract.signatureBurned.call(packetData.signature)



    // drop from queued packets  -- handle this like tokenpool   -- need a way to rebroadcast

  }

  static async sendSignedRawTransaction(web3,txOptions,addressFrom,private_key,callback) {

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




      static truncate0xFromString(s)
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
