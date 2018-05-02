/*
  -Connect to the seed nodes   (make them peers)
  -Download the greater list of nodes from them
  -Connect to ~25 RANDOM nodes from the new overall nodes list

  -Periodically check to make sure you can continue to communicate with the nodes (pinging?)
  -If you are not connected to 25 nodes anymore, try to connect to more of them


  ALSO:
  -keep internal scores of the peers and if they become too bad we block them (fight spammers).. score goes up for being a good actor
*/

const TARGET_PEER_COUNT = 25;
var jayson = require('jayson');

var tcpPortUsed = require('tcp-port-used');


module.exports = class LavaPeerInterface  {

  constructor( relayConfig ) {
    this.relayConfig=relayConfig;
  }

  init() {
    //console.log('relayConfig', this.relayConfig)
    this.initJSONRPCServer()
  }


  async initJSONRPCServer()
  {

    var self = this;


     // create a server
     var server = jayson.server({
       ping: function(args, callback) {

           callback(null, 'pong');

       },
     });

     //use first port available between 9774 and 9790 
     var defaultJSONRPCPort=9774;
     var firstAvailablePort=defaultJSONRPCPort;

     while(firstAvailablePort<9790)
     {
       var portUsed = await this.portInUse(firstAvailablePort);
       if(!portUsed)break;
       firstAvailablePort++;
     }
    console.log('listening on JSONRPC server localhost:',firstAvailablePort)
    server.http().listen(firstAvailablePort);



  }

  async portInUse(port){


      var result = await new Promise(function (fulfilled,error) {

          tcpPortUsed.check(port, '127.0.0.1').then(function(inUse) {
              fulfilled(inUse);
          }, function(err) {
              error(err);
          });


       });

       return result;

  }


}
