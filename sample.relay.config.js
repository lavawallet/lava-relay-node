
var relayconfig = {
  name:'A cool relay node',
  seedNodes: [
    {name:'main1',address:'10.10.10.10:9774'},

  ],
  priceOracleURL: null,
  minGasPriceWei: 10,
  maxGasPriceWei: 6,
  minProfitFactor: 1.5,
  web3provider: 'http://localhost:8545',

  allowTestPackets: true,
}


exports.config = relayconfig;
