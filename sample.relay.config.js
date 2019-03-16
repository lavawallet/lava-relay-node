

var relayconfig = {
  name:'My First Lava Relay',
   //  defaultRelayUrl:'68.183.149.43:80',
  defaultRelayUrl:'localhost:3000', //The same as the external web address
  seedNodes: [
    {url:'68.183.149.43:2082',seed:true},

  ],
  tokens:[
      {name:"Lava",
      symbol:"LAVA",
      tokenType:'lavaToken',
      decimals: 8,
      supportsUnMutation:true,
      lavaReady: true,
      address:"0xd89c37fd7c0fa3b107b7e4a8731dd3aaec488954",
      test_address:"0x5b2970893d4e5d86e92aaad0b109d647bed9cfe5"
      },
      {name:"0xBitcoin",
      symbol:"0xBTC",
      tokenType:'masterToken',
      decimals: 8,
      supportsDelegateCallMutation:true,
      address:"0xb6ed7644c69416d67b522e20bc294a9a9b405b31",
      test_address:"0x1ed72f8092005f7ac39b76e4902317bd0649aee9",
      mutates_to:"LAVA"

    }
  ],
  priceOracleURL: null,
  minGasPriceWei: 10,
  maxGasPriceWei: 6,
  profitMarginPercent: 5,
  environment: 'mainnet',
  allowTestPackets: true,
}



exports.config = relayconfig;
