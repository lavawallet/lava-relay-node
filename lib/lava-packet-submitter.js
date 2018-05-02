/*
  - when a packet looks 'good enough' to submit, it is submitted via web3 !
  - we only do this when it would make us a profit above the 'profit factor' in the config

*/




module.exports = class LavaPacketSubmitter  {

  constructor( relayConfig ) {
    this.relayConfig=relayConfig;
  }

  init() {
     
  }

}
