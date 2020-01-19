
const Tx = require('ethereumjs-tx')

const lavaContractJSON = require('../contracts/LavaWallet.json');
const tokenContractJSON = require('../contracts/_0xBitcoinToken.json');
const deployedContractInfo = require('../DeployedContractInfo.json');


module.exports = class ContractInterface  {


  //getLavaContract(web3,env).methods.signatureBurned('lalala').call()



  static getTokenContract(web3,env)
  {
    return new web3.eth.Contract(tokenContractJSON.abi,ContractInterface.getTokenContractAddress(env))
  }

  static getLavaContract(web3,env)  //not a func ?s  Why not.
  {
    return new web3.eth.Contract(lavaContractJSON.abi,ContractInterface.getLavaContractAddress(env))
  }


  static getTokenContractAddress(env)
  {
    if(env == 'development')
    {
      return deployedContractInfo.networks.testnet.contracts._0xbitcointoken.blockchain_address;
    }else if(env == 'staging'){
      return deployedContractInfo.networks.staging.contracts._0xbitcointoken.blockchain_address;
    }else{
      return deployedContractInfo.networks.mainnet.contracts._0xbitcointoken.blockchain_address;
    }

  }
  static getLavaContractAddress(env)
  {
    if(env == 'development')
    {
      return deployedContractInfo.networks.testnet.contracts.lavawallet.blockchain_address;
    }else if(env == 'staging'){
      return deployedContractInfo.networks.staging.contracts.lavawallet.blockchain_address;
    }else{
      return deployedContractInfo.networks.mainnet.contracts.lavawallet.blockchain_address;
    }

  }

}
