/*
  -Maintain a Redis hashmap of the lava packet mempool

*/

  //keep sorting by the highest fee amount (need price oracle?)
  //drop any lower than 1000
  //drop any that are expired or whose signature is not valid

  //share these with the other nodes as they request them
  //store them in a hashmap - key is the signature
const MAX_MEMPOOL_PACKET_COUNT = 1000;


var LavaPacketUtils = require("./lava-packet-utils");

var ethSigUtil = require('eth-sig-util')

   const web3utils =  require('web3-utils');

   const ContractInterface = require('./contract-interface')

module.exports = class LavaPacketCollector {

  constructor( web3, relayConfig, redisInterface   ) {
    this.web3=web3;
    this.relayConfig=relayConfig;
    this.redisInterface=redisInterface;
  }

  init() {


  }


  async storeNewLavaPacket(packetData)
  {
    console.log('handle new lava packet',packetData )


    if(  LavaPacketUtils.lavaPacketHasValidSignature( packetData ) == false )
    {
      return {success:false,message:'packet has invalid signature'}
    }

    //this is boned
    if(await this.lavaPacketSignatureBurned( packetData , this.relayConfig.environment  ) == true   ) //why do i need == true here ????
    {
      return {success:false,message:'packet has been burned'}
    }



    var existingHash = await this.redisInterface.findHashInRedis("lavapacket", packetData.signature)
    var hashExists = (existingHash != null)


    var ethBlockReceived = await this.redisInterface.getEthBlockNumber();
    //if peer exists then maybe update some fields

    //if not then straight up add it


    if(hashExists)
    {
        console.log('packet signature already exists in redis archive')
      return await this.updateLavaPacket( packetData, ethBlockReceived )
    }else{
      console.log('adding lava packet ',packetData)
      return await this.addLavaPacket(packetData, ethBlockReceived)
    }

  }





  //


  //uses web3 to query the contract for a signatures status .. make sure it has not been burned
  async lavaPacketSignatureBurned(packetData,env){

    console.log('check if burned 1 ')

        var typedData = LavaPacketUtils.getLavaTypedDataFromParams(
          packetData.methodName,
          packetData.relayAuthority,
          packetData.from,
          packetData.to,
          packetData.wallet,
          packetData.tokens,
          packetData.relayerRewardTokens,
          packetData.expires,
          packetData.nonce)

         const types = typedData.types;

      var msgHash = '0x' + LavaPacketUtils.getLavaTypedDataHash(typedData,types).toString('hex')


       console.log('sig was burned?' , msgHash )

     var burnedStatus = 0;

     try{
        burnedStatus =  await ContractInterface.getLavaContract(this.web3,env).methods.signatureHashBurnStatus(msgHash).call()
        //var burnedStatus= 0;
        console.log('sig was burned: ',burnedStatus  )
        }catch(e)
    {
      console.error(e)
    }

    return (burnedStatus != 0);


  }


  async getLavaPacketTokenReward(packetData)
  {
    return web3utils.toBN(packetData.relayerReward);
  }



  async addLavaPacket(packetData, ethBlockReceived)
  {
    console.log('add lava packet',packetData)

    //verify that the packet signature is valid !!  Like the contract does ..


    var packetTxData = {

      ethBlockReceived: ethBlockReceived,
      queued:true,
      pending:false,
      mined:false,
      successful:false

    }




    await this.redisInterface.storeRedisHashData("lavapacket", packetData.signature, JSON.stringify(packetData))
    await this.redisInterface.storeRedisHashData("lavapacket_txdata", packetData.signature, JSON.stringify(packetTxData))

    await this.redisInterface.storeRedisHashData("queued_tx", packetData.signature, JSON.stringify(packetData))




    return {success:true};
  }

  async updateLavaPacket(packetData, ethBlockReceived)
  {
    console.log('update existing lava packet data');

    return {success:true};
  }

  async getLavaPackets()
  {
    var result = [];

    var lavaPackets = await this.redisInterface.getResultsOfKeyInRedis('lavapacket')

    for(var i in lavaPackets)
    {
      var lavaPacketSignature = lavaPackets[i];

     var packetDataJSON = await this.redisInterface.findHashInRedis('lavapacket',lavaPacketSignature);
     var packetData = JSON.parse(packetDataJSON)

     var txdataJSON = await this.redisInterface.findHashInRedis('lavapacket_txdata',lavaPacketSignature)


     var broadcastdataJSON = await this.redisInterface.findHashInRedis('lavapacket_broadcasted',lavaPacketSignature)

     //console.log( 'meep data', txdataJSON  , broadcastdataJSON )
     var txData ;

     if(txdataJSON)
     {
          txData = JSON.parse(txdataJSON)

        packetData.ethBlockReceived = txData.ethBlockReceived;

     }

    //  packetData.predictedTxHash = txData.predictedTxHash;

      if(broadcastdataJSON  )
      {
        var broadcastdata = JSON.parse(broadcastdataJSON)




        packetData.txHash = broadcastdata.txHash;
        packetData.broadcastedAtBlock = broadcastdata.broadcastedAtBlock;

        packetData.txURL = 'https://etherscan.io/tx/'+broadcastdata.txHash;

      }

  //    console.log('json packet data to socket: ', packetData)

      result.push(packetData)

    }



    return result.sort(function(a,b){return b.ethBlockReceived - a.ethBlockReceived});
  }

  async getQueuedLavaPackets()
  {
    var result = [];

    var lavaPackets = await this.redisInterface.getResultsOfKeyInRedis('queued_tx')

    for(var i in lavaPackets)
    {
      var lavaPacketSignature = lavaPackets[i];

     var packetDataJSON = await this.redisInterface.findHashInRedis('lavapacket',lavaPacketSignature);
     var packetData = JSON.parse(packetDataJSON)


      result.push(packetData)

    }

    return result;
  }


}
