const express = require('express')

var bodyParser = require("body-parser"); //listen for POST

    var fs = require('fs');

module.exports =  {



async init( web3, lavaPeer ,https_enabled   )
{
    console.log("init web server...")


    this.web3=web3;
    this.lavaPeer=lavaPeer;


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

    app.post('/lavapacket',function(request,response){
      var from=request.body.from;
      var to=request.body.to;
      var walletAddress=request.body.walletAddress;
      var tokenAddress=request.body.tokenAddress;
      var tokenAmount=request.body.tokenAmount;
      var relayerReward=request.body.relayerReward;
      var expires=request.body.expires;
      var nonce=request.body.nonce;
      var signature=request.body.signature;

      var lavaPacket = {
        from: from,
        to: to,
        walletAddress:walletAddress,
        tokenAddress:tokenAddress,
        tokenAmount:tokenAmount,
        relayerReward:relayerReward,
        expires:expires,
        nonce:nonce,
        signature:signature
      }
      console.log('got POST packet', lavaPacket  )


      this.lavaPeer.getPacketCollector().storeNewLavaPacket();



      response.end('success');

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
  var port = process.env.PORT || 4000;


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


      //  saveMessage(data.chatRoomId, data.senderAddress, data.message);  //to database using sidekiq -> rails
    //});

    socket.on('disconnect', function () {
      console.log(socket.sid, 'disconnected');
      delete sockets[socket.sid];
    });
  });



}




}
