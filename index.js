

var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/gmXEVo5luMPUGPqg6mhy';
var INFURA_MAINNET_URL = 'https://mainnet.infura.io/gmXEVo5luMPUGPqg6mhy';




var Web3 = require('web3')

var web3 = new Web3()


const relayConfig = require('./relay.config').config
const accountConfig = require('./account.config').account


var redisInterface = require('./lib/redis-interface')
var webServer = require('./lib/web-server')

var LavaPeerInterface =  require('./lib/lava-peer-interface');
var lavaPeerInterface = new LavaPeerInterface(redisInterface,relayConfig,accountConfig);


 


var specified_web3 = relayConfig.web3provider;

if(specified_web3 != null)
{
  web3.setProvider(new web3.providers.HttpProvider(specified_web3))
  console.log('using web3',specified_web3)
}else{
  if(relayConfig.environment == 'development')
  {
    console.log("Using test mode!!! - Ropsten ")
    web3.setProvider(new web3.providers.HttpProvider(INFURA_ROPSTEN_URL))
  }else{
    web3.setProvider(new web3.providers.HttpProvider(INFURA_MAINNET_URL))
  }
}


init(web3);


async function init(web3)
{
    console.log("Booting your Lava Relay Node...")

    await redisInterface.init();

    await lavaPeerInterface.init(web3);

    await webServer.init(web3,lavaPeerInterface)

}
