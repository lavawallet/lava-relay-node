/*
  -Maintain a Redis hashmap of the lava packet mempool

*/

  //keep sorting by the highest fee amount (need price oracle?)
  //drop any lower than 1000
  //drop any that are expired or whose signature is not valid

  //share these with the other nodes as they request them
  //store them in a hashmap - key is the signature
const MAX_MEMPOOL_PACKET_COUNT = 1000;


   var web3utils =  require('web3-utils');


module.exports = class LavaPacketCollector {

  constructor( web3, relayConfig, redisInterface ) {
    this.web3=web3;
    this.relayConfig=relayConfig;
    this.redisInterface=redisInterface;
  }

  init() {

  }


  async storeNewLavaPacket(packetData)
  {
    console.log('handle new lava packet',packetData )


    if( !LavaPacketCollector.LavaPacketHasValidSignature( packetData ) )
    {
      return {success:false}
    }

    if( !this.getLavaPacketSignatureBurnStatus( packetData ) != 0x0 )
    {
      return {success:false}
    }


    var existingHash = await this.redisInterface.findHashInRedis("lavapacket", packetData.signature)
    var peerExists = (existingHash != null)

    var ethBlockReceived = await this.redisInterface.getEthBlockNumber();
    //if peer exists then maybe update some fields

    //if not then straight up add it

    if(peerExists)
    {
      return await this.updateLavaPacket( packetData, ethBlockReceived )
    }else{
      return await this.addLavaPacket(packetData, ethBlockReceived)
    }

  }



  static getLavaTypedDataHash(from,to,walletAddress,tokenAddress,tokenAmount,relayerReward,expires,nonce)
  {
    var  hardcodedSchemaHash = 0x313236b6cd8d12125421e44528d8f5ba070a781aeac3e5ae45e314b818734ec3 ;

    console.log(from)
    console.log(to)
    console.log(walletAddress)
    console.log(tokenAddress) //
    console.log(tokenAmount) //
    console.log(relayerReward)
    console.log(expires)
    console.log(nonce)  //how to handle this ?

    nonce = web3utils.toBN(nonce)

      var typedDataHash = web3utils.soliditySha3(
                    hardcodedSchemaHash,
                    web3utils.soliditySha3(from,to,walletAddress,tokenAddress,tokenAmount,relayerReward,expires,nonce)
                    );


    return typedDataHash;
  }



  //
  static LavaPacketHasValidSignature(packetData){

    var sigHash = LavaPacketCollector.getLavaTypedDataHash(packetData.from,packetData.to,packetData.walletAddress,packetData.tokenAddress,packetData.tokenAmount,packetData.relayerReward,packetData.expires,packetData.nonce);

    console.log('sigHash',sigHash)
  //  var recoveredSignatureSigner = ECRecovery.recover(sigHash,packetData.signature);

   var recoveredSignatureSigner = this.web3.eth.personal.ecRecover(sigHash, packetData.signature)

    console.log('recoveredSignatureSigner',recoveredSignatureSigner,from)

    //make sure the signer is the depositor of the tokens
    return packetData.from == recoveredSignatureSigner;

  }

  //uses web3 to query the contract for a signatures status
  async getLavaPacketSignatureBurnStatus(){

  }



  async addLavaPacket(packetData, ethBlockReceived)
  {
    console.log('add lava packet',packetData)

    //verify that the packet signature is valid !!  Like the contract does ..


    await this.redisInterface.storeRedisHashData("lavapacket", packetData.signature, JSON.stringify(packetData))
    await this.redisInterface.storeRedisHashData("lavapacket_receiveblock", packetData.signature, ethBlockReceived)

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
