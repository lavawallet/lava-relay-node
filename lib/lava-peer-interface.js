/*
  -Connect to the seed nodes   (make them peers)
  -Download the greater list of nodes from them
  -Connect to ~25 RANDOM nodes from the new overall nodes list

  -Periodically check to make sure you can continue to communicate with the nodes (pinging?)
  -If you are not connected to 25 nodes anymore, try to connect to more of them


  ALSO:
  -keep internal scores of the peers and if they become too bad we block them (fight spammers).. score goes up for being a good actor
*/

const TARGET_PEER_CONNECTION_COUNT = 15;
var jayson = require('jayson');

var tcpPortUsed = require('tcp-port-used');

var web3utils =  require('web3-utils');

const publicIp = require('public-ip');

var bootedUpAtBlock;
var jsonRPCPort;

/*
peerData
{
  peerId
  url
  lastActiveAtBlock   //we will only ever increment this, not decrement this
}


*/

module.exports = class LavaPeerInterface  {

  constructor( redisInterface, relayConfig ) {
    this.relayConfig=relayConfig;
    this.redisInterface=redisInterface;
  }

  async init() {

    var self = this;

    bootedUpAtBlock = await this.redisInterface.getEthBlockNumber()


    //console.log('relayConfig', this.relayConfig)
    this.initJSONRPCServer()

    //await this.redisInterface.dropList('connectedPeers');

    this.addSeedPeers()

    //connect to peers we had been connected to before + seed peers
    this.sortAndConnectToPeers()




    setTimeout(function(){self.maintainPeersList()},0)
  }

  async maintainPeersList()
  {
    var self = this;

    //ask the peers for information about all of the other peers (they only tell of about recently active peers)
    this.requestAllPeersData()

    //this.sortPeers()
    this.cleanConnectedPeers()
    this.sortAndConnectToPeers()


    setTimeout(function(){self.maintainPeersList()},60 * 1000)
  }

  async addSeedPeers( )
  {

    var seedPeers = this.relayConfig.seedNodes;

    for(var i in seedPeers)
    {
      this.addPeer(seedPeers[i]);
    }

  }

  /*
  The node will know of many peers and it will get data like 'lastAliveAtBlock'

  */
  async addPeer(peerData)
  {

    peerData.peerId = web3utils.sha3(peerData.url)

    console.log('saving peer',peerData)

    await this.redisInterface.storeRedisHashData("peer", peerData.peerId , JSON.stringify(peerData))


  }

  /*
      From each connected_peer, receive and store a bunch of peer data
  */
  async requestAllPeersData()
  {

    var allConnectedPeerKeys = await this.redisInterface.getResultsOfKeyInRedis("connected_peer");

    for(var i in allConnectedPeerKeys)
    {
        var connectedPeerKey = allConnectedPeerKeys[i];

        var peerData = await this.redisInterface.loadRedisHashData("connected_peer", connectedPeerKey )


        var couldConnect;

         var rpcClient = jayson.client.http(
            peerData.url
          );

          var args = []

          var pingResult = await new Promise(function (fulfilled,rejected) {

               rpcClient.request('ping', args, function(err, response) {
                  if(err) {rejected(err); return;}
                  if(typeof response == 'undefined') {rejected(response); return;}

                  fulfilled(response.result)
                });

              });


              console.log('got result from connected peer', pingResult )

    }



  }





    async cleanConnectedPeers()
    {
      //remove stale peers from our connections list

      var allConnectedPeerKeys = await this.redisInterface.getResultsOfKeyInRedis("connected_peer");

      for(var i in allConnectedPeerKeys)
      {
        //if... we havent seen a ping from them in a while...

        // remove
      }



    }


  /*
  The node will maintain a list of 25 of the 'best' peers
  The node will be connected to 10 of those at any given time
  */


  async sortAndConnectToPeers()
  {

      var activeConnectionsCount = await this.redisInterface.getSetLength('connected_peer');
      var additionalConnectionsNeeded = TARGET_PEER_CONNECTION_COUNT - activeConnectionsCount;

      if(additionalConnectionsNeeded <= 0){
         //additionalConnectionsNeeded = 0;
         return;
      }


      var connectionCandidates = [];
      //await this.redisInterface.dropList("connection_candidates");

       //add all the peers from keys into a list "connection_candidates"
      var allPeerKeys = await this.redisInterface.getResultsOfKeyInRedis("peer");

      for(var i in allPeerKeys)
      {
        var peerKey = allPeerKeys[i];

        var peerData = await this.redisInterface.findHashInRedis("peer", peerKey )

        var connectedPeerData = await this.redisInterface.findHashInRedis("connected_peer", peerKey )

        var alreadyConnected = (connectedPeerData != null)  //if not connected to peer

        var candidateNotSelf = ( peerData.peerId == this.getSelfPeerData.peerId )


        if(!alreadyConnected  && candidateNotSelf
          && connectionCandidates.length < additionalConnectionsNeeded){

              connectionCandidates.push( peerData )
        }

      }

      //sort "connection_candidates"


      this.shuffle(connectionCandidates);

      //
      for (var i =0;i< connectionCandidates.length ;i++)
      {
          this.connectToPeer( connectionCandidates[i] )
      }
      //console.log('connecting to peer', peerData)

  }



  async connectToPeer(peerData)
  {
    console.log('connecting to peer',peerData)
    await this.redisInterface.storeRedisData("connected_peer", peerData.peerId, JSON.stringify(peerData));
  }

  async disconnectFromPeer(peerData)
  {
    console.log('disconnecting from peer',peerData)
    await this.redisInterface.deleteHashInRedis("connected_peer", peerData.peerId )

  }

  async updatePeerData(peerData)
  {
    // await this.redisInterface.storeRedisHashData("peer", peerData.peerId , JSON.stringify(peerData))

    //if we are connected to them ...
    // await this.redisInterface.storeRedisHashData("connected_peer", peerData.peerId , JSON.stringify(peerData))

  }

  //returns an array.. from redis

  //returns 255 random peers
  async getAllActivePeers()
  {
      var result = [];

      var allPeerKeys = await this.redisInterface.getResultsOfKeyInRedis("peer");

      for(var i in allPeerKeys)
      {
        var peerKey = allPeerKeys[i];

        var peerData = await this.redisInterface.findHashInRedis("peer", peerKey )


        //If the peer is active -- has been communicating recently
        result.push(peerData)


      }

      result = result.slice(0, 255);
      this.shuffle(result)
      return result;
  }

  async getSelfPeerData()
  {
    var peerData = {};

     peerData.url = this.getSelfNodeURL();

     peerData.peerId = web3utils.sha3(peerData.url)

     return peerData;
  }

  async getSelfNodeURL()
  {

    var ipAddress = await new Promise(function (fulfilled,error) {

          publicIp.v4().then(ip => {
            console.log(ip);
            fulfilled(ip);
          });

     });


     var port = jsonRPCPort;

     return ipAddress + ":" + port;


  }

  async initJSONRPCServer()
  {

    var self = this;


     // create a server
     var server = jayson.server({
       ping: function(args, callback) {

           callback(null, 'pong');

       },

       getProtocolVersion: function(args, callback) {

           callback(null, '1.0.0');

       },

       getAllActivePeers: function(args, callback) {

           var activePeers = self.getAllActivePeers();

           activePeers.push( self.getSelfPeerData() );

           callback(null, {'activePeers':activePeers});

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

   jsonRPCPort = firstAvailablePort;
    console.log('listening on JSONRPC server localhost:',jsonRPCPort)
    server.http().listen(jsonRPCPort);


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

  /**
   * Shuffles array in place.
   * @param {Array} a items An array containing the items.
   */
  shuffle(a) {
      var j, x, i;
      for (i = a.length - 1; i > 0; i--) {
          j = Math.floor(Math.random() * (i + 1));
          x = a[i];
          a[i] = a[j];
          a[j] = x;
      }
      return a;
  }


}
