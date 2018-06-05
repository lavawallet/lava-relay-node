
var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/gmXEVo5luMPUGPqg6mhy';

var LavaPeerInterface = require('../lib/lava-peer-interface');

var redisInterface = require('../lib/redis-interface')

const relayConfig = require('../relay.config').config


var Web3 = require('web3')

var web3 = new Web3()

web3.setProvider(new web3.providers.HttpProvider(INFURA_ROPSTEN_URL))


var assert = require('assert');

  describe('Lava Packet', function() {
    it('packet can be created', async function() {


      var lavaPeerInterface = new LavaPeerInterface(redisInterface,relayConfig);

      await redisInterface.init();

      await lavaPeerInterface.init(web3);



      var packetData = {
        from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
        to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
        walletAddress:"0x1d0d66272025d7c59c40257813fc0d7ddf2c4826",
        tokenAddress:"0x9d2cc383e677292ed87f63586086cff62a009010",
        tokenAmount:200000000,
        relayerReward:100000000,
        expires:3365044,
        nonce:"0xc18f687c56f1b2749af7d6151fa351", //needs to be a string !!
        signature:"0x8ef27391a81f77244bf95df58737eecac386ab9a47acd21bdb63757adf71ddf878169c18e4ab7b71d60f333c870258a0644ac7ade789d59c53b0ab75dbcc87d11b"
    }

    console.log('packet data ! ')

      var packet = await lavaPeerInterface.getPacketCollector().storeNewLavaPacket(packetData);



      console.log('stored new packet' , packet)

      assert.ok( packet  );
      return ;

    });


      it('checks for valid signature', async function() {


      });

  });
