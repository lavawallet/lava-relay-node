

const $ = require('jquery');

var web3utils = require('web3-utils')
var sigUtil = require('eth-sig-util')

import Vue from 'vue'


export default class LavaPacketRenderer {


  async init(alertRenderer, ethHelper)
  {

    console.log('init lava packet renderer')

        if(this.lavaWalletContract)
        {


          var defaultAction = 'deposit';

          if(this.networkVersion == 'legacy')
          {
            defaultAction = 'withdraw';
          }

          let DEFAULT_RELAY_NODE_URL = lavaSeedNodes.seedNodes[0].address;

            actionContainer = new Vue({
             el: '#action-container',
             data: {
                     selectedActionAsset: {name: 'nil'},
                     shouldRender: false,
                     supportsDelegateCallDeposit: false,
                     selectedActionType: defaultAction,
                     approveTokenQuantity: 0,
                     depositTokenQuantity: 0,
                     approveAndDepositTokenQuantity: 0,
                     withdrawTokenQuantity: 0,
                     transferTokenMethod: 'transfer',
                     transferTokenQuantity: 0,
                     transferTokenRecipient : 0,
                     transferTokenRelayReward: 0,
                     broadcastMessage: null,
                     relayNodeURL: DEFAULT_RELAY_NODE_URL,
                     lavaPacketData: null,
                     lavaPacketExists: false
                  }

           });


        }



  }

}
