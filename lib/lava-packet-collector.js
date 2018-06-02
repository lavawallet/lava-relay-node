/*
  -Maintain a Redis hashmap of the lava packet mempool

*/

  //keep sorting by the highest fee amount (need price oracle?)
  //drop any lower than 1000
  //drop any that are expired or whose signature is not valid

  //share these with the other nodes as they request them
  //store them in a hashmap - key is the signature
const MAX_MEMPOOL_PACKET_COUNT = 1000;


module.exports = class LavaPacketCollector {

  constructor( relayConfig, redisInterface ) {
    this.relayConfig=relayConfig;
    this.redisInterface=redisInterface;
  }

  init() {

  }


  async storeNewLavaPacket(packetData)
  {
    console.log('handle new lava packet',packetData )

    var existingHash = await this.redisInterface.findHashInRedis("lavapacket", packetData.signature)
    var peerExists = (existingHash != null)

    var ethBlockReceived = await this.redisInterface.getEthBlockNumber();
    //if peer exists then maybe update some fields

    //if not then straight up add it

    if(peerExists)
    {
      await this.updateLavaPacket( packetData, ethBlockReceived )
    }else{
      await this.addLavaPacket(packetData, ethBlockReceived)
    }

  }

  async addLavaPacket(packetData, ethBlockReceived)
  {
    console.log('add lava packet',packetData)

    //verify that the packet signature is valid !!  Like the contract does ..


    await this.redisInterface.storeRedisHashData("lavapacket", packetData.signature, JSON.stringify(packetData))
    await this.redisInterface.storeRedisHashData("lavapacket_receiveblock", packetData.signature, ethBlockReceived)

  }

  async updateLavaPacket(packetData, ethBlockReceived)
  {
    console.log('update existing lava packet data')
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
