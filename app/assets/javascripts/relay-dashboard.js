
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
         packetRenderer.update()
    },5*1000);


    renderer.init();

    packetRenderer = new LavaPacketRenderer();

    ethHelper = new EthHelper( packetRenderer );
    ethHelper.init();


    packetRenderer.init(ethHelper);
    packetRenderer.update();

  }

}
