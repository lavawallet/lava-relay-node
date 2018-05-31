
var RelayUtils = require('./relay-utils');


let ethGasStationAPIURL = "https://ethgasstation.info/json/ethgasAPI.json"


module.exports = class EthGasOracle  {

  static getGasData( ){
    var response = RelayUtils.HTTPGet( ethGasStationAPIURL );
    return JSON.parse(response);
  }

}
