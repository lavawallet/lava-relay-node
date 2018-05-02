/*
  -Connect to the seed nodes   (make them peers)
  -Download the greater list of nodes from them
  -Connect to ~25 RANDOM nodes from the new overall nodes list

  -Periodically check to make sure you can continue to communicate with the nodes (pinging?)
  -If you are not connected to 25 nodes anymore, try to connect to more of them


  ALSO:
  -keep internal scores of the peers and if they become too bad we block them (fight spammers).. score goes up for being a good actor 
*/

const TARGET_PEER_COUNT = 25;


module.exports = class LavaPeerInterface  {

  constructor( relayConfig ) {
    this.relayConfig=relayConfig;
  }

  init() {
    console.log('relayConfig', this.relayConfig)
  }

}
