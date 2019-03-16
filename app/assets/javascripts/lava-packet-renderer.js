

const $ = require('jquery');

var web3utils = require('web3-utils')
var sigUtil = require('eth-sig-util')



const relayConfig = require('../../../relay.config').config

import LavaWalletHelper from './lava-wallet-helper'

import TokenUtils from './token-utils'

import LavaPacketHelper from './lava-packet-helper'

const ContractInterface = require('../../../lib/contract-interface')

import Vue from 'vue'
var actionContainer;
var assetList;

export default class LavaPacketRenderer {


  async init( ethHelper )
  {

    console.log('init lava packet renderer')

    var env = relayConfig.environment;

    this.ethHelper=ethHelper;

    var lavaContractAddress = ContractInterface.getLavaContractAddress( env )



        if( lavaContractAddress )
        {
          var defaultAction = 'transfer';

          let DEFAULT_RELAY_NODE_URL = relayConfig.defaultRelayUrl;

            actionContainer = new Vue({
             el: '#action-container',
             data: {
                     selectedActionAsset: {name: 'nil'},
                     shouldRender: false,
                     supportsDelegateCallMutation: false,
                     supportsUnMutation: false,
                     lavaReady:false,
                     selectedActionType: defaultAction,
                     approveTokenQuantity: 0,
                     mutateTokenQuantity: 0,
                     unmutateTokenQuantity: 0,
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

       var defaultTokenData = TokenUtils.getAllTokensData();


       this.registerDropEvents()


          assetList = new Vue({
          el: '#asset-list',
          data: {

             tokens: {token_list: defaultTokenData }

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


  async update()
  {
      var account = this.ethHelper.getConnectedAccountAddress();

      var defaultTokenData = TokenUtils.getAllTokensData();



      for(var i=0;i<defaultTokenData.length;i++)
      {
        var tokenData = defaultTokenData[i]
        var balance = await LavaWalletHelper.getTokenBalance(this.ethHelper, tokenData.symbol, account)




          defaultTokenData[i].token_balance = balance;
          defaultTokenData[i].token_balance_formatted = TokenUtils.formatAmountWithDecimals(balance,tokenData.decimals);

            console.log('new token data ',  defaultTokenData[i] )

        await this.updateTokenDataList( defaultTokenData )
      }


  }


  async updateTokenDataList( allTokenData )
  {

    await Vue.set(assetList, "tokens" ,  {token_list: allTokenData }  );

  }

  async updatePacketFeeStats( data )
  {
      console.log('update packet fee data ',data )

        if( isNaN( actionContainer.transferTokenRelayReward) || actionContainer.transferTokenRelayReward <= 0 )
        {
          Vue.set(actionContainer,'transferTokenRelayReward',data.targetFastRewardTokens  );
        }


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

        var assetData =  TokenUtils.getTokenDataByAddress(address)// this.getAssetDataFromAddress(address)


        await Vue.set(actionContainer, "selectedActionAsset" , assetData);


        ///supportsDelegateCallMutation: false,
        //supportsUnMutation: false,
        //lavaEnabled:false,

        var supportsDelegateCallMutation = (assetData.supportsDelegateCallMutation == true)
        var supportsUnMutation = (assetData.supportsUnMutation == true)
        var lavaReady = (assetData.lavaReady == true)

        await Vue.set(actionContainer, "supportsDelegateCallMutation" , supportsDelegateCallMutation);
        await Vue.set(actionContainer, "supportsUnMutation" , supportsUnMutation);
        await Vue.set(actionContainer, "lavaReady" , lavaReady);

        await Vue.set(actionContainer, "shouldRender" , true);


        var self = this;

        Vue.nextTick(function () {
           self.registerActionContainerClickHandler();

           self.selectActiveAction("")
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

        async registerActionContainerClickHandler()
        {
          var self = this;



          $('.tab-action').off();
          $('.tab-action').on('click',  function(){

            var actionType = $(this).data('action-type');

            self.selectActiveAction(actionType);

          });

          $('.btn-action-approve').off();
          $('.btn-action-approve').on('click',  function(){

            var selectedActionAsset = actionContainer.selectedActionAsset ;

            var tokenAddress = selectedActionAsset.address;
            var approveAmount = actionContainer.approveTokenQuantity;
            var tokenDecimals = selectedActionAsset.decimals;

              console.log('approve ', tokenAddress,  approveAmount)
               LavaWalletHelper.executeTokenAction(self.ethHelper,tokenAddress, 'approve', approveAmount,function(error,response){
                  console.log(response)
               });


            //  LavaWalletHelper.approveToken(tokenAddress, approveAmount, tokenDecimals, function(error,response){
            //   console.log(response)
            //});

          });




          $('.btn-action-mutate').off();
          $('.btn-action-mutate').on('click',  function(){

            var selectedActionAsset = actionContainer.selectedActionAsset ;

            var tokenAddress = selectedActionAsset.address;
            var mutateAmount = actionContainer.mutateTokenQuantity;
            var tokenDecimals = selectedActionAsset.decimals;


            console.log('mutate ', tokenAddress,  mutateAmount)
            LavaWalletHelper.executeTokenAction(self.ethHelper,tokenAddress, 'mutate', mutateAmount,function(error,response){
               console.log(response)
            });

              /*  LavaWalletHelper.depositToken(tokenAddress, mutateAmount, tokenDecimals, function(error,response){
               console.log(response)
            });*/

          });


          $('.btn-action-unmutate').off();
          $('.btn-action-unmutate').on('click',  function(){

            var selectedActionAsset = actionContainer.selectedActionAsset ;

            var tokenAddress = selectedActionAsset.address;
            var amount = actionContainer.unmutateTokenQuantity;
            var tokenDecimals = selectedActionAsset.decimals;


            console.log('unmutate ', tokenAddress,  amount)
            LavaWalletHelper.executeTokenAction(self.ethHelper,tokenAddress, 'unmutate', amount,function(error,response){
               console.log(response)
            });

          });

          $('.btn-action-approve-and-deposit').off();
          $('.btn-action-approve-and-deposit').on('click',  function(){

            var selectedActionAsset = actionContainer.selectedActionAsset ;

            var tokenAddress = selectedActionAsset.address;
            var depositAmount = actionContainer.approveAndDepositTokenQuantity;
            var tokenDecimals = selectedActionAsset.decimals;


                console.log('approve and deposit ', tokenAddress,  depositAmount)
              self.approveAndDepositToken(tokenAddress, depositAmount, tokenDecimals, function(error,response){
               console.log(response)
            });

          });

          $('.btn-action-lava-transfer').off();
          $('.btn-action-lava-transfer').on('click', async function(){

            var selectedActionAsset = actionContainer.selectedActionAsset ;

            var tokenAddress = selectedActionAsset.address;
            var transferAmount = actionContainer.transferTokenQuantity;
            var transferRecipient = actionContainer.transferTokenRecipient;
            var transferRelayReward = actionContainer.transferTokenRelayReward;
            var tokenDecimals = selectedActionAsset.decimals;

            var method = actionContainer.transferTokenMethod; //could also be withdraw or approve


           console.log('lava transfer gen ', tokenAddress,  transferAmount, transferRecipient)


            var lavaPacketString = await  LavaWalletHelper.generateLavaTransaction(self.ethHelper, method,tokenAddress, transferAmount, transferRecipient, transferRelayReward, tokenDecimals);


             console.log('GOT GENERATION', lavaPacketString)

             await Vue.set(actionContainer, "lavaPacketExists" , true);
             await Vue.set(actionContainer, "lavaPacketData" , lavaPacketString);

             Vue.nextTick(function () {
               self.registerLavaPacketDownloadButton(lavaPacketString)
               self.registerLavaPacketBroadcastButton(lavaPacketString)
             })


          });

        }


        async resetLavaPacket()
        {
          await  Vue.set(actionContainer, "lavaPacketExists" , false);
        }


        async registerLavaPacketDownloadButton(lavaPacketString)
        {

            var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lavaPacketString));
            $('#btn-download-lava-packet').empty();
            $('<a href="data:' + data + '" download="packet.lava" class="button is-primary btn-download-lava-packet">Download Lava Packet</a>').appendTo('#btn-download-lava-packet');


        }

        async registerLavaPacketBroadcastButton(lavaPacketString)
        {
          var self = this;

          $('.btn-broadcast-lava-packet').on('click',function(){
              self.broadcastLavaPacket(lavaPacketString)
          })


        }

        async broadcastLavaPacket(lavaPacketString)
        {
          console.log('broadcast ',lavaPacketString, actionContainer.relayNodeURL)

          var lavaPacketData = JSON.parse(lavaPacketString)

          console.log(lavaPacketData)

          var response = await LavaPacketHelper.sendLavaPacket(actionContainer.relayNodeURL, lavaPacketData)

          if(response.success)
          {
            await  Vue.set(actionContainer, "broadcastMessage" , "Success!");
          }else{
            await  Vue.set(actionContainer, "broadcastMessage" , response.message);
          }

          /*for(var i in lavaSeedNodes.seedNodes)
          {
            var seed = lavaSeedNodes.seedNodes[i];


            $.ajax({
                url: seed.address,
                type: 'POST',
                data: {lavaPacketString:lavaPacketString}
              });

          }*/


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

                       LavaWalletHelper.initiateLavaPackTransaction( JSON.parse( parsedFileJson) )

                      };
                    })(file);

                  reader.readAsText(file); // start reading the file data.
              }
          }
        }




}
