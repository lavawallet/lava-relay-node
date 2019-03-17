



const $ = require('jquery');

var web3utils = require('web3-utils')
var sigUtil = require('eth-sig-util')



var lavaContract = require('../../../contracts/LavaToken.json')
var _0xBitcoinContract = require('../../../contracts/_0xBitcoinToken.json')
var erc20TokenContract = require('../../../contracts/ERC20Interface.json')
var demutatorContract = require('../../../contracts/DeMutator.json')




import LavaWalletHelper from './lava-wallet-helper'

import TokenUtils from './token-utils'

const ContractInterface = require('../../../lib/contract-interface')

import Vue from 'vue'



const relayConfig = require('../../../relay.config').config

var ethContainer;
var packetRenderer;

export default class EthHelper {


    constructor( packRenderer )
    {
         packetRenderer = packRenderer;

    }


   async init( packRenderer )
   {
     console.log('init eth helper')

     var self = this;



     ethContainer = new Vue({
      el: '#eth-container',
      data: {
              errorMessage:null,
              connected: false,
              web3address:null,
              etherscanURL:null,
              lavaTokenAddress: null,
              lavaTokenURL:null

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

   getWeb3Instance()
   {
     return this.web3;
   }

   getConnectedAccountAddress()
   {

     if(typeof this.getWeb3Instance() == 'undefined')
     {
       this.renderError( 'No Connected Account. Please connect to web3 first.' )
       return;
     }

     return this.getWeb3Instance().eth.accounts[0];
   }

   async getCurrentEthBlockNumber()
   {

     if(typeof this.getWeb3Instance() == 'undefined')
     {
       this.renderError( 'Please connect to web3 first.' )
       return;
     }

     var web3 = this.getWeb3Instance();

    return await new Promise(function (fulfilled,error) {
           web3.eth.getBlockNumber(function(err, result)
         {
           if(err){error(err);return}
           console.log('eth block number ', result )
           fulfilled(result);
           return;
         });
      });

   }

   async updateEthAccountInfo(web3)
   {
     console.log('eth account info',web3)

     this.clearError();

     this.web3 = web3;


     var lavaAddress = ContractInterface.getLavaContractAddress( relayConfig.environment);



     await Vue.set(ethContainer, "lavaTokenAddress" , lavaAddress);
     await Vue.set(ethContainer, "lavaTokenURL" , 'https://etherscan.io/address/'+lavaAddress);


     await Vue.set(ethContainer, "web3address" , web3.eth.accounts[0]);
     await Vue.set(ethContainer, "etherscanURL" , 'https://etherscan.io/address/'+web3.eth.accounts[0] + '#tokentxns');




     await packetRenderer.update()
   }

   async renderError(message)
   {
     await Vue.set(ethContainer, "errorMessage" , message);
   }

   async clearError()
   {
     await Vue.set(ethContainer, "errorMessage" , null);
   }


    getTokenContractInstance(tokenData)
  {
    console.log('get contract instance ', tokenData.symbol)

    this.clearError();

    if(typeof this.getWeb3Instance() == 'undefined')
    {
      this.renderError( 'Please connect to web3 first.' )
      return;
    }

    var tokenAddress = tokenData.address;
    var tokenType = tokenData.tokenType;

    var tokenContractABI = this.getContractABIFromType( tokenType )

    var instance = this.getWeb3ContractInstance( tokenAddress, tokenContractABI  )

    return instance;
    /*
    var contract =  ethHelper.getWeb3ContractInstance(
      this.web3,
      this.lavaWalletContract.blockchain_address,
      lavaContractABI.abi
    ); */


  }

  getContractABIFromType(tokenType)
  {
    switch(tokenType) {
        case 'masterToken':
            return _0xBitcoinContract.abi;
          break;
        case 'lavaToken':
            return  lavaContract.abi;
          break;
        default:
          return;
          // code block
      }
  }


  getWeb3ContractInstance(  contract_address, contract_abi )
  {

    console.log('get contract instance ', contract_address , contract_abi)

    var web3 = this.getWeb3Instance();

    if(contract_address == null)
    {
        renderError('Internal Error: Missing contract address')
       return;
    }

    if(contract_abi == null)
    {
      renderError('Internal Error: Missing contract ABI')
     return;
    }

    var instance =  web3.eth.contract(contract_abi).at(contract_address)

    console.log('wwww',instance)

    return instance
  }



  //personal sign typed data
   async signMsg(from,data) {

     var result = await new Promise(async resolve => {

          web3.currentProvider.sendAsync({
            method: 'eth_signTypedData_v3',
            params: [from, data],  //switched in new release
            from: from,
          },
              function(err, result) {
              if (err) {
                  return console.error(err);
              }
              const signature = result.result.substring(2);
              const r = "0x" + signature.substring(0, 64);
              const s = "0x" + signature.substring(64, 128);
              const v = parseInt(signature.substring(128, 130), 16);
              // The signature is now comprised of r, s, and v.

              console.log('packet: ',data)
              console.log('got sig! ', ('0x'+signature))

                resolve( ('0x'+signature) );
              }
          );

   });
   return result;

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
