/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/

const Tx = require('ethereumjs-tx')
const ContractInterface = require('./contract-interface')
const relayConfig = require('../relay.config').config


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
    setInterval(function(){self.pollLavaPacketsToSubmit()},5000);

    setTimeout(function(){self.monitorPendingLavaPackets()},2000);
  }

  async pollLavaPacketsToSubmit()
  {
    console.log("!!!!  poll packets to submit")

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

         var packetIsExecutingBLContracts = await self.packetIsExecutingBlacklistedContracts(packetData)


         var packetIsAttractiveStatus = await self.packetIsAttractiveToSubmit(packetData);
         var packetWasBroadcasted = (broadcastedPacketDataJSON != null)

         var packetWasBroadcastedRecently = false;

         if( packetWasBroadcasted   )
         {
           var broadcastedPacketData= JSON.parse(broadcastedPacketDataJSON)

           var currentEthBlock = await self.redisInterface.getEthBlockNumber();

           if( broadcastedPacketData.broadcastedAtBlock != null
                && ((currentEthBlock - broadcastedPacketData.broadcastedAtBlock) <= 50  )  )
           {
             packetWasBroadcastedRecently = true;
           }

         }


         //if packet is worthy of submitting ....
         if(  ( !packetWasBroadcastedRecently  ) && !txdata.pending)   // if not, ignore the packet
         {

           // set it to pending


           if(packetIsAttractiveStatus.attractive == true && packetIsExecutingBLContracts == false)  //if not , remove from queue
           {
                 console.log('packet is attractive! <3', packetData)

                 var broadcastingSpeed = 'normal';

                 if( packetIsAttractiveStatus.fast == true )
                 {
                  console.log('broadcasting tx fast !')
                  broadcastingSpeed = 'fast'
                 }

                 txdata.pending = true;
                 txdata.queued = false;
                  //await this.redisInterface.deleteHashInRedis('queued_tx',signature)









                       var relayData = await this.lavaPeer.getRelayData();


                      var relayingGasPrice = relayData.ethGasNormal; //this.relayConfig.solutionGasPriceWei

                      if(broadcastingSpeed == 'fast')
                      {
                        relayingGasPrice = relayData.ethGasFast;
                      }


                       var txResult = await LavaPacketSubmitter.broadcastLavaPacket(packetData,broadcastingSpeed,relayingGasPrice,this.getRelayAccount(),this.web3,this.relayConfig.environment);



                      console.log('meep2', txResult)

                    if( !txResult.success )
                    {
                      console.log('error with broadcasting ')


                      var txHash = txResult.pTxHash;
                      var receipt = txResult.receipt;


                      txdata.pending = false;
                      txdata.queued = false;
                      txdata.errored = true; //check for this and display on dashboard

                    //  console.error(err.name, err.message);

                      //txdata.errorMessage = err.message;

                      packetData.txHash = txHash;
                      packetData.broadcastedAtBlock = currentEthBlock;

                       await this.redisInterface.deleteHashInRedis('queued_tx',signature)
                      await this.redisInterface.storeRedisHashData('lavapacket_broadcasted',signature,JSON.stringify(packetData))

                      await this.redisInterface.storeRedisHashData('lavapacket_errored',signature,JSON.stringify(packetData))

                    } else {


                   var currentEthBlock = await self.redisInterface.getEthBlockNumber();

                   console.log('new txResult!! ', txResult)

                   //  result({receipt: receipt, pTxHash: predictedTxHash, success:true})
                   var txHash = txResult.pTxHash;
                   var receipt = txResult.receipt;

                   console.log(' RECEIPT ', receipt )
                    console.log(' pTXHASH  ', txHash )

                   packetData.txHash = txHash;
                   packetData.broadcastedAtBlock = currentEthBlock;


                   await this.redisInterface.storeRedisHashData('lavapacket_broadcasted',signature,JSON.stringify(packetData))

                     console.log('Stored pTXHASH  ', txHash )

                    await this.redisInterface.storeRedisHashData('lavapacket_txdata',signature,JSON.stringify(txdata))

                   await this.redisInterface.deleteHashInRedis('queued_tx',signature)


                   break packetloop;
                   }

               }else{

                  //not attractive
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



            console.log('Monitor lost packet: ', packetData, txdata)
            //  txdata.queued = false;
            //  txdata.dropped = true;

          }

       }


    }




  //  setTimeout(function(){self.pollLavaPacketsToSubmit()},10*1000);
  }


  async monitorPendingLavaPackets()
  {

    var self = this;

    var relayedPacketsData = await this.getPacketRelayStats();

    var currentEthBlock = await self.redisInterface.getEthBlockNumber();


      var lavaPackets = await self.redisInterface.getResultsOfKeyInRedis('queued_tx')
        console.log('monitoring pending packets !! ',lavaPackets.length)

    if(relayedPacketsData.pendingCount >= 1 || lavaPackets.length > 0 )    //if a packet is   pending right now ....
    {



      monitorloop:
      for(var i in lavaPackets)
      {
         var signature = lavaPackets[i];


         var broadcastedPacketDataJSON = await self.redisInterface.findHashInRedis('lavapacket_broadcasted',signature);

         var basePacketDataJSON = await this.redisInterface.findHashInRedis("lavapacket", signature)
         var basePacketData  = JSON.parse(basePacketDataJSON)


         var txdataJSON = await this.redisInterface.findHashInRedis('lavapacket_txdata',signature)
         var txdata  = JSON.parse(txdataJSON)


         //this should be giving us something


         var packetWasBroadcasted = (broadcastedPacketDataJSON != null)

          console.log('bleep bloop' , broadcastedPacketDataJSON , signature)

          var blocks_to_wait_before_drop = 15;


         if(  packetWasBroadcasted   && !txdata.mined   )
         {
            var packetData = JSON.parse(broadcastedPacketDataJSON)

           //get mining receipt

           console.log('check if tx was mined ', packetData.txHash)

           var packetMiningStatus = await this.getPacketMiningStatus(packetData.txHash);



           if(packetMiningStatus.mined == true && packetData.txHash !=null)
           {   //this never happens

             txdata.pending=false;
             txdata.mined=true;
             txdata.success=packetMiningStatus.success;
             await this.redisInterface.storeRedisHashData('lavapacket_txdata',signature,JSON.stringify(txdata))

             await this.redisInterface.deleteHashInRedis('queued_tx',signature)

             console.log('tx was mined', packetData.txHash )
           }else if(  txdata.ethBlockReceived  <  (currentEthBlock - blocks_to_wait_before_drop )  )  //drop in 15 blocks
           {
             console.log('tx wasnt mined in '+blocks_to_wait_before_drop+' blocks, dropping ')
             txdata.pending=false;
             txdata.errored = true; //check for this and display on dashboard
             txdata.errorMessage = 'this packet wasnt mined in 50 blocks';
             await this.redisInterface.deleteHashInRedis('queued_tx',signature)


           }

           //else do nothing


         }else  //no broadcast data
         {

           console.log('inspect base ', txdata  , currentEthBlock)
           if(  txdata.ethBlockReceived  <  (currentEthBlock - blocks_to_wait_before_drop )  )
           {
             console.log('tx wasnt mined in '+blocks_to_wait_before_drop+' blocks, dropping ')
             txdata.pending=false;
             txdata.errored = true; //check for this and display on dashboard
             txdata.errorMessage = 'this packet wasnt mined in 50 blocks';
             await this.redisInterface.deleteHashInRedis('queued_tx',signature)


           }


         }

      }

    }



    setTimeout(function(){self.monitorPendingLavaPackets()},10*1000);
  }


  async getPacketMiningStatus(txHash)
  {

    //this is weird

    if(!txHash)
    {
      console.log('packet mining status attempted on null txhash.')
      return {mined:false,success:false}
    }

      var receipt = await LavaPacketSubmitter.requestTransactionReceipt(txHash,this.web3)


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

  async updateTxUponWillFail(packetData)
  {
      console.log('update tx upon will fail',packetData)
  }

  //a score for how attractive a packet is to relay ...
  getLavaScore(lavaPacket)
  {
    return lavaPacket.relayerRewardTokens ;  //other factors ?
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
  async packetIsExecutingBlacklistedContracts(packetData)
  {
    console.log('check if executing blacklisted', packetData)
    if(packetData.methodName == 'transfer' || packetData.methodName == 'approve' )
    {

      return false;
    }

    var targetIsWhitelisted = false;
    var whitelistedContracts = relayConfig.remoteCallContractWhitelist;

    for(var i=0; i< whitelistedContracts.length; i++)
    {
      if(packetData.to.toLowerCase() == whitelistedContracts[i].toLowerCase() )
      {
        targetIsWhitelisted = true;
      }
    }


    if(  targetIsWhitelisted  )
    {
      return false;
    }

    console.log('-- Tried to Execute BLACKLISTED --')
    return true;
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

    console.log('relayer reward', parseInt(packetData.relayerRewardTokens))

    var relayRewardAboveSafeLow = ( parseInt(packetData.relayerRewardTokens) >= targetSafeLowRewardSatoastis )
    var relayRewardAboveNormal = ( parseInt(packetData.relayerRewardTokens) >= targetNormalRewardSatoastis )
    var relayRewardAboveFast = ( parseInt(packetData.relayerRewardTokens) >= targetFastRewardSatoastis )

    //dont use safe low
    //relayRewardAboveSafeLow ||
    return {attractive: ( relayRewardAboveNormal || relayRewardAboveFast ), fast: relayRewardAboveFast } ;

  }

    static async broadcastLavaPacket(packetData,broadcastingSpeed,relayingGasPrice,relayAccount,web3,env)
  {

    var self = this;
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

     var txWillWork = false;


     var max_gas_cost = 704624;

     try{
       var estimatedGasCost = await lavaTransferMethod.estimateGas({gas: max_gas_cost, from:addressFrom, to: addressTo });

        txWillWork = true
     }catch(error)
     {

       console.log('error, tx will fail');
      //  self.updateTxUponWillFail(packetData)

        return error;    //this will result in a resolved promise.
     }

     console.log('estimated gas ', estimatedGasCost)



   /*

     if( estimatedGasCost > max_gas_cost){
       console.log("Gas estimate too high!  Something went wrong ")
       return;
     }



     */





     //safelow ?
      console.log('relayingGasPrice ', relayingGasPrice)



      let encoded_tx = lavaTransferMethod.encodeABI();

      let txOptions = {
          nonce: web3utils.toHex(txCount),
          gas: web3utils.toHex(max_gas_cost),
          gasPrice: web3utils.toHex(web3utils.toWei(relayingGasPrice.toString(), 'gwei') ),
          data: encoded_tx,
          value:0,
          from: addressFrom,
          to: addressTo
      };




      var pKey =  relayAccount.privateKey;

    //  console.log('SIGNED WITH pkey' )

    //  const privateKey = new Buffer( pKey, 'hex')

    //maybe something is wrong w pkey!?


  //  var txResult

  //  console.log('would broadcast tx here...')

       var txResult = await this.sendSignedRawTransaction(web3,txOptions,addressFrom,pKey)

      return txResult;



    // drop from queued packets  -- handle this like tokenpool   -- need a way to rebroadcast

  }

  static async sendSignedRawTransaction(web3,txOptions,addressFrom,private_key ) {

    var privKey = this.truncate0xFromString( private_key )

    const privateKey = new Buffer( privKey, 'hex')
    const transaction = new Tx(txOptions)


    transaction.sign(privateKey)


    const serializedTx = transaction.serialize().toString('hex')

      var predictedTxHash = '0x' + new Tx( serializedTx ).hash().toString('hex')

      console.log('predicted TX hash ', predictedTxHash)

      //unhandled promise rejection ??

         var sentTx =  await new Promise(function (result,error) {

             web3.eth.sendSignedTransaction('0x' + serializedTx, function(err,res){
              if(err)
              {
                error( {receipt: null, pTxHash: predictedTxHash, success:false} )
              }


                result({receipt: res, pTxHash: predictedTxHash, success:true})

            })

           //return { pTxHash: predictedTxHash, success: true }
         });


         console.log('sent signed tx', sentTx);

         return sentTx;


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
