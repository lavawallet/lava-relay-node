/*
  -Maintain a Redis hashmap of the lava packet mempool

*/

  //keep sorting by the highest fee amount (need price oracle?)
  //drop any lower than 1000
  //drop any that are expired or whose signature is not valid

  //share these with the other nodes as they request them
  //store them in a hashmap - key is the signature
const MAX_MEMPOOL_PACKET_COUNT = 1000;


var lavaUtils = require("./lava-utils");

var ethSigUtil = require('eth-sig-util')

   const web3utils =  require('web3-utils');
   const ethjsutil = require('ethereumjs-util')

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


    if(await this.lavaPacketHasValidSignature( packetData ) == false )
    {
      return {success:false,message:'packet has invalid signature'}
    }

    //this keeps happening ??
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
      return await this.updateLavaPacket( packetData, ethBlockReceived )
    }else{
      return await this.addLavaPacket(packetData, ethBlockReceived)
    }

  }



  static getLavaTypedDataHash(from,to,walletAddress,tokenAddress,tokenAmount,relayerReward,expires,nonce)
  {
    var  hardcodedSchemaHash = '0x313236b6cd8d12125421e44528d8f5ba070a781aeac3e5ae45e314b818734ec3' ;

    nonce = web3utils.toBN(nonce)

      var typedDataHash = web3utils.soliditySha3(
                    hardcodedSchemaHash,
                    web3utils.soliditySha3(from,to,walletAddress,tokenAddress,tokenAmount,relayerReward,expires,nonce)
                    );


    return typedDataHash;
  }



  //
  async lavaPacketHasValidSignature(packetData){

    var sigHash = LavaPacketCollector.getLavaTypedDataHash(packetData.from,packetData.to,packetData.walletAddress,packetData.tokenAddress,packetData.tokenAmount,packetData.relayerReward,packetData.expires,packetData.nonce);



    var msgBuf = ethjsutil.toBuffer(packetData.signature)
    const res = ethjsutil.fromRpcSig(msgBuf);


    var hashBuf = ethjsutil.toBuffer(sigHash)

    const pubKey  = ethjsutil.ecrecover(hashBuf, res.v, res.r, res.s);
    const addrBuf = ethjsutil.pubToAddress(pubKey);
    const recoveredSignatureSigner    = ethjsutil.bufferToHex(addrBuf);



    //make sure the signer is the depositor of the tokens
    return packetData.from.toLowerCase() == recoveredSignatureSigner.toLowerCase();

  }

  //uses web3 to query the contract for a signatures status .. make sure it has not been burned
  async lavaPacketSignatureBurned(packetData,env){


        var params = lavaUtils.getLavaParamsFromData(packetData.from,packetData.to,packetData.walletAddress,packetData.tokenAddress,packetData.tokenAmount,packetData.relayerReward,packetData.expires,packetData.nonce)

        var msgParams = {data: params}

      var msgHash = ethSigUtil.typedSignatureHash(msgParams.data)


              console.log('sig was burned?' , msgHash )

     var burnedStatus = await ContractInterface.getWalletContract(this.web3,env).methods.signatureBurnStatus(msgHash).call()
    //var burnedStatus= 0;
    console.log('sig was burned: ',burnedStatus  )

    return (burnedStatus   != 0);


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


      result.push(packetData)

    }

    return result;
  }

}
