


var RelayUtils = require('./relay-utils');

let mercatoxAPIURL = "https://mercatox.com/public/json24";


module.exports = class MarketOracle  {

  static getMercatoxPriceData( ){
    var response = RelayUtils.HTTPGet( mercatoxAPIURL );
    return response;
  }

}
