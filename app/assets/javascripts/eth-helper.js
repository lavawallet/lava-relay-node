



const $ = require('jquery');

var web3utils = require('web3-utils')
var sigUtil = require('eth-sig-util')


import LavaWalletHelper from './lava-wallet-helper'

import TokenUtils from './token-utils'

const ContractInterface = require('../../../lib/contract-interface')

import Vue from 'vue'



const relayConfig = require('../../../relay.config').config

var ethContainer;

export default class EthHelper {

   async init()
   {
     console.log('init eth helper')

     var self = this;

     ethContainer = new Vue({
      el: '#eth-container',
      data: {
              errorMessage:null,
              connected: false,
              web3address:null,
              etherscanURL:null
            }
      });



      $('.btn-action-connect-web3').off();
      $('.btn-action-connect-web3').on('click',  async function(){

            await self.connectWeb3();

      });


   }


   async connectWeb3( ){

     var self = this;
     console.log('connect web3')

    /* if (typeof web3 !== 'undefined') {

           window.web3 = new Web3(new Web3.providers.HttpProvider(INFURA_MAINNET_URL));
           console.log('connected to web3!')
           return window.web3;

     } else {

          renderError('No web3. Please install a web3 provider such as MetaMask.')
           return {}
         // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
         //window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

     }*/


     // Modern dapp browsers...
        if (window.ethereum) {
            window.web3 = new Web3(ethereum);
            try {
                // Request account access if needed
                await ethereum.enable();
                // Acccounts now exposed

                await Vue.set(ethContainer, "connected" , true);
                await self.updateEthAccountInfo(web3)

              //  web3.eth.sendTransaction({/* ... */});
            } catch (error) {
                // User denied account access...
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            window.web3 = new Web3(web3.currentProvider);
            // Acccounts always exposed
            //web3.eth.sendTransaction({/* ... */});

            await Vue.set(ethContainer, "connected" , true);
            await self.updateEthAccountInfo(web3)
        }
        // Non-dapp browsers...
        else {
            self.renderError('Non-Ethereum browser detected. You should consider trying MetaMask!');
        }


   }

   async updateEthAccountInfo(web3)
   {
     console.log('eth account info',web3)

     await Vue.set(ethContainer, "web3address" , web3.eth.accounts[0]);
     await Vue.set(ethContainer, "etherscanURL" , 'https://etherscan.io/address/'+web3.eth.accounts[0]);



   }

   async renderError(message)
   {
     await Vue.set(ethContainer, "errorMessage" , message);
   }


  async getTokenContractInstance(tokenData)
  {
    console.log('get contract instance ', tokenData.symbol)
  }

  getWeb3ContractInstance(web3, contract_address, contract_abi )
  {
    if(contract_address == null)
    {
      contract_address = this.getContractAddress();
    }

    if(contract_abi == null)
    {
      contract_abi = this.getContractABI();
    }

      return web3.eth.contract(contract_abi).at(contract_address)


  }


  getContractAddress()
  {
     return deployedContractInfo.networks.mainnet.contracts._0xbitcointoken.blockchain_address;
  }

  getContractABI()
  {
     return _0xBitcoinContract.abi;
  }


}
