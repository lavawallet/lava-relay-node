


var RelayUtils = require('./relay-utils');

let mercatoxAPIURL = "https://mercatox.com/public/json24";


module.exports = class MarketOracle  {

  static getMercatoxPriceData( pair ){
    var response = RelayUtils.HTTPGet( mercatoxAPIURL );

    if(pair)
    {
      return JSON.parse(response).pairs[pair];
    }

    return JSON.parse(response);
  }


}
