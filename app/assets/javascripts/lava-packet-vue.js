

const $ = require('jquery');
import Vue from 'vue'



var lavaPacketUtils = require("../../../lib/lava-packet-utils");

var ContractInterface = require("../../../lib/contract-interface");

var deployedContractInfo = require('../../../DeployedContractInfo.json')

var actionContainer;

export default class LavaPacketVue {



    async init( web3, ethHelper )
    {

        this.lavaWalletContract = ContractInterface.getLavaContract(web3 ,'development')

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
                     relayKingRequired: 'any relayers',
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
