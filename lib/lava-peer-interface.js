/*
  -Connect to the seed nodes   (make them peers)
  -Download the greater list of nodes from them
  -Connect to ~25 RANDOM nodes from the new overall nodes list

  -Periodically check to make sure you can continue to communicate with the nodes (pinging?)
  -If you are not connected to 25 nodes anymore, try to connect to more of them


  ALSO:
  -keep internal scores of the peers and if they become too bad we block them (fight spammers).. score goes up for being a good actor


  IMPROVEMENTS:
  How to make sure the relayers are sharing the packets and not acting selfish ?  --as long as there is one trustworthy sharing node everyone gets them all
      --relayers give 'nice points' to those who give them new potential packets

  How to make sure the relayers dont all send a packet in (pending) at once and get reverts?
  --maybe all the miners use a different gwei price based on some algorithm
*/



const TARGET_PEER_CONNECTION_COUNT = 15;
var jayson = require('jayson');




var EthGasOracle = require('./eth-gas-oracle');

var MarketOracle = require('./market-oracle');



var tcpPortUsed = require('tcp-port-used');

var web3utils =  require('web3-utils');

const publicIp = require('public-ip');


var LavaPacketCollector =  require('./lava-packet-collector');



var LavaPacketSubmitter =  require('./lava-packet-submitter');

var packetCollector;
var packetSubmitter;

var bootedUpAtBlock;
var jsonRPCPort;

/*
peerData
{
  peerId
  url
  lastSeededAtBlock
  lastActiveAtBlock   //we will only ever increment this, not decrement this .. shared with others
  receivedResponseFromAtBlock  //a local flag ONLY, not shared with others
}


*/

module.exports = class LavaPeerInterface  {

  constructor(   redisInterface, relayConfig, accountConfig ) {

    this.relayConfig=relayConfig;
    this.redisInterface=redisInterface;
    this.accountConfig=accountConfig;


  }

  async init(web3) {

    this.web3 = web3;

    packetCollector = new LavaPacketCollector(web3, this.relayConfig, this.redisInterface);
    packetSubmitter = new LavaPacketSubmitter(web3, this, this.relayConfig, this.accountConfig, this.redisInterface);

    packetSubmitter.init();

    var self = this;

    await this.collectPeriodicData();

    bootedUpAtBlock = await this.redisInterface.getEthBlockNumber()


    //console.log('relayConfig', this.relayConfig)
    await this.initJSONRPCServer()

    //await this.redisInterface.dropList('connectedPeers');

    await this.addSeedPeers()

    //connect to peers we had been connected to before + seed peers
    await this.sortAndConnectToPeers()



    setInterval(function(){self.collectPeriodicData()},10* 1000)
    setTimeout(function(){self.maintainPeersList()},0)
  }


  async collectPeriodicData()
  {
    var web3 = this.web3;
    var ethBlockNumber = await new Promise(function (fulfilled,error) {
          web3.eth.getBlockNumber(function(err, result)
        {
          if(err){error(err);return}
          console.log('eth block number ', result )
          fulfilled(result);
          return;
        });
     });


    this.redisInterface.storeRedisData('ethBlockNumber', ethBlockNumber )

    try{
      var gasData = EthGasOracle.getGasData();
      this.redisInterface.storeRedisData('ethGasFast', (gasData.fast / 10.0 ) )
      this.redisInterface.storeRedisData('ethGasFastWait', gasData.fastWait )
      this.redisInterface.storeRedisData('ethGasNormal', (gasData.average / 10.0 ) ) //gwei
      this.redisInterface.storeRedisData('ethGasNormalWait', gasData.averageWait )
      this.redisInterface.storeRedisData('ethGasSafeLow', (gasData.safeLow / 10.0 ) ) //gwei
      this.redisInterface.storeRedisData('ethGasSafeLowWait', gasData.safeLowWait )
      this.redisInterface.storeRedisData('ethGasBlockNumber', gasData.blockNum )

    }catch(e){
      console.error(e)
    }

    try{
      var marketData = MarketOracle.getMercatoxPriceData("0xBTC_ETH");
      this.redisInterface.storeRedisData('tokenPriceData', JSON.stringify(marketData) )
    }catch(e){
      console.error(e)
    }


  }


  async maintainPeersList()
  {
    var self = this;

    //ask the peers for information about all of the other peers (they only tell of about recently active peers)
    await this.requestAllPeersData()

    //this.sortPeers()
    await this.cleanConnectedPeers()
    await this.sortAndConnectToPeers()


    setTimeout(function(){self.maintainPeersList()},60 * 1000)
  }

  async addSeedPeers( )
  {

    var seedPeers = this.relayConfig.seedNodes;

    for(var i in seedPeers)
    {
      await this.handleNewSharedPeer(seedPeers[i]);
    }

  }

  /*
  The node will know of many peers and it will get data like 'lastAliveAtBlock'

  */


  async addPeer(peerData)
  {


    if(peerData != null && peerData.url != null)
    {
      peerData.peerId =  web3utils.sha3(peerData.url)

      console.log('saving peer',peerData)


      await this.redisInterface.storeRedisHashData("peer", peerData.peerId , JSON.stringify(peerData))

    }else{
      console.error('could not add peer ', peerData)
    }


  }





  //don't always just blindly overwrite data !!!
  async handleNewSharedPeer(peerData)
  {
    console.log('handle new shared peer',peerData )
    var existingHash= await this.redisInterface.findHashInRedis("peer", peerData.peerId)
    var peerExists = (existingHash != null)

    //if peer exists then maybe update some fields

    //if not then straight up add it

    if(peerExists)
    {
      await this.updatePeerData( peerData )
      // updatePeerData(peerData)
    }else{
      await this.addPeer(peerData)
    }

  }



    async updatePeerData(updatedPeerData)
    {

      var peerDataJSON = await this.redisInterface.findHashInRedis("peer", updatedPeerData.peerId )
      var peerData = JSON.parse(peerDataJSON)


      if(updatedPeerData.lastActiveAtBlock > peerData.lastActiveAtBlock)
      {
        peerData.lastActiveAtBlock = updatedPeerData.lastActiveAtBlock;
      }

      await this.redisInterface.storeRedisHashData("peer", peerData.peerId , JSON.stringify(peerData))

        //we dont update connected_peer data, it is always stale so always refernce the data in PEER !!
    }


  /*
      From each connected_peer, receive and store a bunch of peer data
  */
  async requestAllPeersData()
  {
    console.log('request peers data ')

    var self = this;

    var allConnectedPeerKeys = await this.redisInterface.getResultsOfKeyInRedis("connected_peer");


    var ethBlockNumber = await this.redisInterface.getEthBlockNumber()

    console.log('allConnectedPeerKeys ',allConnectedPeerKeys)


    var requestedDataAtBlock = await this.redisInterface.getEthBlockNumber()


    var selfPeerData = await this.getSelfPeerData();

    for(var i in allConnectedPeerKeys)
    {
        var connectedPeerKey = allConnectedPeerKeys[i];


        //always use the data stored in PEER not in CONNECTED PEER
        var peerDataJSON = await this.redisInterface.findHashInRedis("peer", connectedPeerKey )
        var peerData = JSON.parse(peerDataJSON)

        if(peerData.peerId == selfPeerData.peerId) continue;


        console.log('request peers data from', peerData)



        var couldConnect = true;

         var rpcClient = jayson.client.http(
           'http://'+  peerData.url
          );

          var args = []

          var protocolResult = await new Promise(function (fulfilled,rejected) {
               rpcClient.request('getProtocolVersion', args, function(err, response) {

                  if(err) {rejected(err); return;}
                  if(typeof response == 'undefined') {rejected(response); return;}

                  fulfilled(response.result)
                });

              }).catch(error => console.log(error));

          if(protocolResult == null )
          {
            couldConnect = false;
          }
          console.log('got response from connected peer:', couldConnect )


          var selfData = await self.getSelfPeerData();
          args = [
            selfData
          ]

          var protocolResult = await new Promise(function (fulfilled,rejected) {
               rpcClient.request('giveSelfPeerData', args, function(err, response) {

                  if(err) {rejected(err); return;}
                  if(typeof response == 'undefined') {rejected(response); return;}

                  fulfilled(response.result)
                });

              }).catch(error => console.log(error));

          if(protocolResult == null )
          {
            couldConnect = false;
          }
          console.log('got response from connected peer:', couldConnect )



          args = []

          var activePeersResult = await new Promise(function (fulfilled,rejected) {
               rpcClient.request('getNodeActivePeers', args, function(err, response) {

                  if(err) {rejected(err); return;}
                  if(typeof response == 'undefined') {rejected(response); return;}

                  fulfilled(response.result)
                });

              }).catch(error => console.log(error));

          if(activePeersResult == null )
          {
            couldConnect = false;
          }else{
             console.log('got a new list of active peers:', activePeersResult )

             var newActivePeers =  activePeersResult.activePeers

             console.log('new a p ', newActivePeers)
              for(var i in newActivePeers)
              {
                  var newPeer = newActivePeers[i];
                  await self.handleNewSharedPeer(newPeer);
              }

          }

            //update this peers data based on if we could connect !!!
              ///----

            await this.updatePeerWithReceivedResponse( peerData,  couldConnect , ethBlockNumber)


    }



  }


  async updatePeerWithReceivedResponse(peerData,receivedResponse, ethBlockNumber)
  {
    if(receivedResponse)
    {
      peerData.lastActiveAtBlock = ethBlockNumber;
      peerData.receivedResponseFromAtBlock = ethBlockNumber;
    }else{
      await this.disconnectFromPeer(peerData);
    }

    await this.handleNewSharedPeer(peerData)

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

      var activeConnectionsCount = await this.redisInterface.getHashLength('connected_peer');
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

        var peerDataJSON = await this.redisInterface.findHashInRedis("peer", peerKey )
        var peerData = JSON.parse(peerDataJSON)

        var connectedPeerData = await this.redisInterface.findHashInRedis("connected_peer", peerKey )

        var alreadyConnected = (connectedPeerData != null)  //if not connected to peer

        var candidateNotSelf = ( peerData.peerId != this.getSelfPeerData.peerId )


        if(peerData!=null && !alreadyConnected  && candidateNotSelf
          && connectionCandidates.length < additionalConnectionsNeeded){
              connectionCandidates.push( peerData )
        }

      }

      //sort "connection_candidates"

      this.shuffle(connectionCandidates);


      //
      for (var i =0;i< connectionCandidates.length ;i++)
      {
        await this.connectToPeer( connectionCandidates[i] )
      }
      //console.log('connecting to peer', peerData)

  }



  async connectToPeer(peerData)
  {

    if(peerData!=null)
    {


        console.log('connecting to peer', peerData.peerId,JSON.stringify(peerData))
         peerData.peerId = web3utils.sha3(peerData.url).toString()

        await this.redisInterface.storeRedisHashData("connected_peer", peerData.peerId, JSON.stringify(peerData));

    }
  }

  async disconnectFromPeer(peerData)
  {
    console.log('disconnecting from peer',peerData)
    await this.redisInterface.deleteHashInRedis("connected_peer", peerData.peerId )

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

        var peerDataJSON  = await this.redisInterface.findHashInRedis("peer", peerKey )

        //  console.log('meep test', peerDataJSON)
       var peerData = JSON.parse(peerDataJSON)

        //If the peer is active -- has been communicating recently
        result.push(peerData)
      }


        console.log('result',result)
        result = result.slice(0, 255);
        this.shuffle(result)


      return result;
  }

  async getSelfPeerData()
  {
    var peerData = {};

     peerData.url = await this.getSelfNodeURL();

     peerData.peerId = web3utils.sha3(peerData.url).toString()

     return peerData;
  }




  async getTargetRewardTokens(dataName)
  {

    let _GAS_REQUIRED_FOR_TX_RELAY = 130151;

    var profitMarginPercent =  this.relayConfig.profitMarginPercent;



    var tokenPriceDataJSON =  await  this.redisInterface.loadRedisData('tokenPriceData'  )
    var tokenPriceData = JSON.parse(tokenPriceDataJSON)

    var ethGasGwei = await this.redisInterface.loadRedisData(dataName ) ;

    var ethGasCost = ethGasGwei / (Math.pow(10,9))


    var requiredEthForTXRelay = _GAS_REQUIRED_FOR_TX_RELAY * ethGasCost;


    var highestBid = tokenPriceData.highestBid;


    var requiredTokensForTXRelay = (requiredEthForTXRelay / highestBid)

    var targetTokensForTXRelay = requiredTokensForTXRelay * (1 + (profitMarginPercent/ 100.0))

    return targetTokensForTXRelay;


  }


  async getRelayData()
  {
    var relayData = {};

     relayData.name =  this.relayConfig.name;
     relayData.profitMarginPercent = this.relayConfig.profitMarginPercent;

     relayData.ethGasFast = await this.redisInterface.loadRedisData('ethGasFast'  ) ;
     relayData.ethGasNormal = await this.redisInterface.loadRedisData('ethGasNormal'  ) ;
     relayData.ethGasSafeLow = await this.redisInterface.loadRedisData('ethGasSafeLow'  ) ;

     var tokenPriceDataJSON =  await  this.redisInterface.loadRedisData('tokenPriceData'  )
     var tokenPriceData = JSON.parse(tokenPriceDataJSON)

     relayData.lowestAskPrice = tokenPriceData.lowestAsk;
     relayData.highestBidPrice = tokenPriceData.highestBid;

     relayData.targetSafeLowRewardTokens = parseFloat( await this.getTargetRewardTokens('ethGasSafeLow') ).toFixed(3)
     relayData.targetNormalRewardTokens = parseFloat( await this.getTargetRewardTokens('ethGasNormal') ).toFixed(3)
     relayData.targetFastRewardTokens = parseFloat( await this.getTargetRewardTokens('ethGasFast') ).toFixed(3)


     return relayData;
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


  getPacketCollector()
  {
    return packetCollector;
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

       getNodeActivePeers: async function(args, callback) {


         //add self as a peer


         var selfPeer =  await self.getSelfPeerData() ;

        await self. handleNewSharedPeer(selfPeer);


           var activePeers = await self.getAllActivePeers();



            console.log('active peers being sent ', activePeers)

           callback(null,   {'activePeers': activePeers   }    );

       },


       giveSelfPeerData: async function(args, callback) {

           var newPeerData = args[0];

           console.log('learned about peer', newPeerData)

           await self.handleNewSharedPeer(newPeerData);


           callback(null,   {'success': true  }    );

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
