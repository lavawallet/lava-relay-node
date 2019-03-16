const express = require('express')


const relayConfig = require('../relay.config').config

var bodyParser = require("body-parser"); //listen for POST

    var fs = require('fs');

module.exports =  {



async init( web3, lavaPeer ,https_enabled   )
{
    console.log("init web server...")


    this.web3=web3;
    this.lavaPeer=lavaPeer;


    var self = this;


    const app = express()

    if(https_enabled)
    {
      console.log('using https')

      var config = require('./sslconfig');

      var sslOptions ={
      key: fs.readFileSync(config.ssl.key),
      cert: fs.readFileSync(config.ssl.cert)/*,
      ca: [
        fs.readFileSync(config.ssl.root, 'utf8'),
        fs.readFileSync(config.ssl.chain, 'utf8')
      ]*/
     }



      var server = require('https').createServer(sslOptions,app);

    }else{
      var server = require('http').createServer(app);

    }



    app.use('/', express.static('public'))
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.all('/*', function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type,accept,access_token,X-Requested-With');
      next();
  });


  /*
  Lava Packet Data

    from: from,
    to: to,
    walletAddress:walletAddress,
    tokenAddress:tokenAddress,
    tokenAmount:tokenAmount,
    relayerReward:relayerReward,
    expires:expires,
    nonce:nonce,
    signature:signature

  */

    app.get('/stats',async function(request,response){
      //return stats about the relay
      var stats = await self.lavaPeer.getRelayData()
      console.log('get stats',stats)

      response.send(JSON.stringify(stats));

    });

    app.post('/lavapacket',async function(request,response){

      console.log('received POST',request )
      console.log('received POST body ',  request.body)

      var methodName=request.body.methodName;
      var relayAuthority=request.body.relayAuthority;
      var from=request.body.from;
      var to=request.body.to;
      var wallet=request.body.wallet;

      var tokens=request.body.tokens;
      var relayerRewardTokens=request.body.relayerRewardTokens;
      var expires=request.body.expires;
      var nonce=request.body.nonce;
      var signature=request.body.signature;

      var lavaPacket = {
        methodName:methodName,
        relayAuthority:relayAuthority,
        from: from,
        to: to,
        wallet:wallet,
        tokens:tokens,
        relayerRewardTokens:relayerRewardTokens,
        expires:expires,
        nonce:nonce,
        signature:signature
      }
      console.log('got POST packet', lavaPacket  )

      var result = await self.lavaPeer.getPacketCollector().storeNewLavaPacket(lavaPacket);



      if(result.success  )
      {
        response.end(JSON.stringify({message:'success',success:true}));
      }else{
        console.error(result.message)
        response.end(JSON.stringify({message:result.message,success:false}));
      }




    });

  /*  app.get('/profile/:address',function(req,res)
        {
            var address = null;

            if(req.params.address)
            {
              address = req.params.address;
            }

            res.sendFile('index.html', {root: './public/profile'});
        });*/





  /*  app.use('/profile/:address',

        express.static('public/profile')
      )*/

  //  app.use(express.static('public'))
  //  app.get('/', (req, res) => res.send('Hello World!'))

    app.listen(3000, () => console.log('Web app listening on port 3000!'))


    this.startSocketServer(server)
},

startSocketServer(server )
{





  var self = this;
  var io = require('socket.io')(server);
  var port = relayConfig.websocketsPort || 4000;


  ///  https://socket.io/docs/rooms-and-namespaces/#


  server.listen(port, function () {
    console.log('Socket server listening at port %d', port);
  });

  var sockets = {};


  io.on('connection', function (socket) {
    console.log('established new socket connection');


        socket.on('ping', function (data) {
          console.log('ping', data);

            io.emit('pong', {
                message:'pong'
              });


           });



        socket.on('getRelayData', async function (data) {

             var relayData = await self.lavaPeer.getRelayData()

             socket.emit('relayData',  relayData);

           });



         socket.on('getLavaPackets', async function (data) {

            var lavaPackets = await self.lavaPeer.getPacketCollector().getLavaPackets()

            socket.emit('lavaPackets',  lavaPackets);

          });

          socket.on('getQueuedTx', async function (data) {

             var lavaPackets = await self.lavaPeer.getPacketCollector().getQueuedLavaPackets()

             socket.emit('queuedTx',  lavaPackets);

           });

      //  saveMessage(data.chatRoomId, data.senderAddress, data.message);  //to database using sidekiq -> rails
    //});

    socket.on('disconnect', function () {
      console.log(socket.sid, 'disconnected');
      delete sockets[socket.sid];
    });
  });



}




}
