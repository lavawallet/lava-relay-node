
const $ = require('jquery');

import EthHelper from './eth-helper'
import LavaPacketRenderer from './lava-packet-renderer'
var packetRenderer;


var ethHelper;

export default class RelayDashboard {


  init(renderer)
  {
    setInterval( function(){
         renderer.update();
    },5*1000);


    renderer.init();

    ethHelper = new EthHelper();
    ethHelper.init();

    packetRenderer = new LavaPacketRenderer();
    packetRenderer.init(ethHelper);


  }

}
