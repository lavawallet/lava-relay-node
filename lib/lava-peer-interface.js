module.exports = class LavaPeerInterface  {

  constructor( relayConfig ) {
    this.relayConfig=relayConfig;
  }

  init() {
    console.log('relayConfig', this.relayConfig)
  }

}
