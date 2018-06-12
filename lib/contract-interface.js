
const Tx = require('ethereumjs-tx')

const walletContractJSON = require('../contracts/LavaWallet.json');
const tokenContractJSON = require('../contracts/_0xBitcoinToken.json');
const deployedContractInfo = require('../contracts/DeployedContractInfo.json');


module.exports = class ContractInterface  {


  //getWalletContract(web3,env).methods.signatureBurned('lalala').call()



  static getTokenContract(web3,env)
  {
    return new web3.eth.Contract(tokenContractJSON.abi,ContractInterface.getTokenContractAddress(env))
  }

  static getWalletContract(web3,env)
  {
    return new web3.eth.Contract(walletContractJSON.abi,ContractInterface.getWalletContractAddress(env))
  }


  static getTokenContractAddress(env)
  {
    if(env == 'test')
    {
      return deployedContractInfo.networks.testnet.contracts._0xbitcointoken.blockchain_address;
    }else if(env == 'staging'){
      return deployedContractInfo.networks.staging.contracts._0xbitcointoken.blockchain_address;
    }else{
      return deployedContractInfo.networks.mainnet.contracts._0xbitcointoken.blockchain_address;
    }

  }
  static getWalletContractAddress(env)
  {
    if(env == 'test')
    {
      return deployedContractInfo.networks.testnet.contracts.lavawallet.blockchain_address;
    }else if(env == 'staging'){
      return deployedContractInfo.networks.staging.contracts.lavawallet.blockchain_address;
    }else{
      return deployedContractInfo.networks.mainnet.contracts.lavawallet.blockchain_address;
    }

  }

}
