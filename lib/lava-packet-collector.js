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

  constructor( relayConfig ) {
    this.relayConfig=relayConfig;
  }

  init() {
   
  }

}
