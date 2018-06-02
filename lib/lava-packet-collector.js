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

    var existingHash= await this.redisInterface.findHashInRedis("lavapacket", packetData.signature)
    var peerExists = (existingHash != null)

    //if peer exists then maybe update some fields

    //if not then straight up add it

    if(peerExists)
    {
      //await this.updatePeerData( peerData )
      // updatePeerData(peerData)
    }else{
      //await this.addPeer(peerData)
    }

  }

}
