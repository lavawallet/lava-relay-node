var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


const relayConfig = require('../relay.config').config


module.exports = class RelayUtils  {


  static HTTPGet(url){
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open("GET",url,false);
    Httpreq.send(null);
    return Httpreq.responseText;
  }


  

}
