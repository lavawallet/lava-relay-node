

const $ = require('jquery');

var web3utils = require('web3-utils')
var sigUtil = require('eth-sig-util')


const relayConfig = require('../../../relay.config').config

const ContractInterface = require('../../../lib/contract-interface')

import Vue from 'vue'
var actionContainer;

export default class LavaPacketRenderer {


  async init(alertRenderer, ethHelper)
  {

    console.log('init lava packet renderer')

    var env = relayConfig.environment;

    var lavaContractAddress = ContractInterface.getLavaContractAddress( env )



        if( lavaContractAddress )
        {
          var defaultAction = 'transfer';

          let DEFAULT_RELAY_NODE_URL = relayConfig.seedNodes[0].address;

            actionContainer = new Vue({
             el: '#action-container',
             data: {
                     selectedActionAsset: {name: 'nil'},
                     shouldRender: false,
                     supportsDelegateCallDeposit: false,
                     lavaEnabled:false,
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




        var defaultTokenData = relayConfig.tokens


       console.log(defaultTokenData)

        defaultTokenData.map(t => t.icon_url = "/app/assets/images/token_icons/"+t.address+".png"   )

       if(relayConfig.env == 'development')
       {
         defaultTokenData.map(t => t.address = t.test_address   )
       }


       this.registerDropEvents()
       console.log(defaultTokenData)



        var assetList = new Vue({
          el: '#asset-list',
          data: {

            tokens: {token_list:defaultTokenData}

               },

          methods: {
             update: function () {

             }
           }
        });

        var self = this;

        Vue.nextTick(function () {
          self.registerAssetRowClickHandler()

        })

  }

  async registerAssetRowClickHandler()
  {
    var self = this;


    $('.asset-row').off();
    $('.asset-row').on('click',async function(){
      var token_address = $(this).data('tokenaddress');
      console.log('token_address',token_address);

      self.selectActionAsset(token_address)

    });
  }


    async selectActionAsset(address)
      {
        var self = this;

        var assetData = this.getAssetDataFromAddress(address)


        await Vue.set(actionContainer, "selectedActionAsset" , assetData);

        var supportsDelegateCallDeposit = (assetData.supportsDelegateCallDeposit == true)

        var lavaReady = (assetData.lavaReady == true)

        await Vue.set(actionContainer, "supportsDelegateCallDeposit" , supportsDelegateCallDeposit);

        await Vue.set(actionContainer, "lavaReady" , lavaReady);

        await Vue.set(actionContainer, "shouldRender" , true);

        Vue.nextTick(function () {
           self.registerActionContainerClickHandler();
        })

      }

      async selectActiveAction(actionName)
        {
          var self = this;

          console.log('select active action',actionName);

          self.resetLavaPacket();

          await  Vue.set(actionContainer, "selectedActionType" , actionName);

          Vue.nextTick(function () {
             self.registerActionContainerClickHandler();
          })

        }

        async resetLavaPacket()
        {
          await  Vue.set(actionContainer, "lavaPacketExists" , false);
        }

        getAssetDataFromAddress(address)
        {
          console.log('get asset data ',address);

          var matchingToken  = relayConfig.tokens.find(t => t.address == address );

          console.log(matchingToken);

          return matchingToken  ;

        }


        registerDropEvents()
        {
          var self = this ;


          $('.lava-packet-dropzone').on('dragover', function(e) {
               e.stopPropagation();
               e.preventDefault();
             //  e.dataTransfer.dropEffect = 'copy';
           });

          console.log('added listenr ')

          $('.dropzone-file-input').on('change', function(e) {
            e.stopPropagation();
            e.preventDefault();

            console.log('handle packet drop' )

            var files =   $(this).prop('files'); // Array of all files
            console.log(files)

            self.readDroppedFiles(files);
          });


           $('.lava-packet-dropzone').on('drop', function(e) {
             e.stopPropagation();
             e.preventDefault();

             console.log('handle packet drop' )

             var files = e.originalEvent.dataTransfer.files; // Array of all files
             console.log(files)
              self.readDroppedFiles(files);


            } )


        }


        async readDroppedFiles(files)
        {
          var self = this ;

          for (var i=0, file; file=files[i]; i++) {

              if (file.name.endsWith('.lava')) {

                  var reader = new FileReader();
                    // Closure to capture the file information.
                    reader.onload = (function(theFile) {
                      return function(e) {
                       var parsedFileJson = JSON.parse(e.target.result);

                       self.initiateLavaPackTransaction( JSON.parse( parsedFileJson) )

                      };
                    })(file);

                  reader.readAsText(file); // start reading the file data.
              }
          }
        }


        async initiateLavaPackTransaction(lavaPacket)
        {
          console.log('initiate', lavaPacket);
          console.log('to', lavaPacket.to);

          //DO IN ANOTHER LIB
        }

}
