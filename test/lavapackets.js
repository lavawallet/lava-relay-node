
var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/gmXEVo5luMPUGPqg6mhy';

var LavaPeerInterface = require('../lib/lava-peer-interface');

var redisInterface = require('../lib/redis-interface')
var ContractInterface = require('../lib/contract-interface')

const relayConfig = require('../relay.config').config


var Web3 = require('web3')

var web3 = new Web3()

web3.setProvider(new web3.providers.HttpProvider(INFURA_ROPSTEN_URL))


var assert = require('assert');

var lavaPeerInterface;


  describe('Lava Packet', function() {



    it('packet can be created', async function() {

        lavaPeerInterface = new LavaPeerInterface(redisInterface,relayConfig);

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

          var response = await lavaPeerInterface.getPacketCollector().lavaPacketHasValidSignature(packetData)

            assert.equal( response, true  );
      });


      it('checks for invalid signature', async function() {

            var packetData = {
              from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
              to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
              walletAddress:"0x1d0d66272025d7c59c40257813fc0d7ddf2c4826",
              tokenAddress:"0x9d2cc383e677292ed87f63586086cff62a009010",
              tokenAmount:200000000,
              relayerReward:100000000,
              expires:3365044,
              nonce:"0xc28f687c56f1b2749af7d6151fa351", //wrong nonce for sig
              signature:"0x8ef27391a81f77244bf95df58737eecac386ab9a47acd21bdb63757adf71ddf878169c18e4ab7b71d60f333c870258a0644ac7ade789d59c53b0ab75dbcc87d11b"
          }

          var response = await lavaPeerInterface.getPacketCollector().lavaPacketHasValidSignature(packetData)

            assert.equal( response  , false );


      });

      it('checks for burned signature as false ', async function() {

      //  console.log('methodd',ContractInterface.getWalletContract(web3,'test'))
          var response = await ContractInterface.getWalletContract(web3,'test').signatureBurned.call('0x8e527391a81f77244bf95df58737eecac386ab9a47acd21bdb63757adf71ddf878169c18e4ab7b71d60f333c870258a0644ac7ade789d59c53b0ab75dbcc87d11b')

          assert.equal( response  , false );

      });

        it('checks for targetSafeLowRewardTokens ', async function() {

            var testPacket = { from: '0x530d92dfb5caa11347f26ee741910dee6eed3208',
                to: '0xb0A84c52C7a701A2E87bcb6E28cD79d12e8DF490',
                walletAddress: '0xcba65975b1c66586bfe7910f32377e0ee55f783e',
                tokenAddress: '0xb6ed7644c69416d67b522e20bc294a9a9b405b31',
                tokenAmount: '10000000',
                relayerReward: '2000',
                expires: '5783895',
                nonce: '0x5865aa3c12a379b6d5271dc9b7cb9',
                signature: '0xce8571661c794f41f49addf97e548feaa76c2dc2ee7bf970ad51d15184e494422e14e074c270fd2a8d8f98d921ba1cf9d30abed74501499baa3f432c93aa5d711b' }


              var targetSafeLowRewardTokens = (0.08);

              console.log('target safe low tokens', targetSafeLowRewardTokens)


              var targetSafeLowRewardSatoastis =  (targetSafeLowRewardTokens * (10**8) );
              // 0.0086
              console.log('target safe low satoastis', targetSafeLowRewardSatoastis)

              assert.equal( parseInt(testPacket.relayerReward) >= targetSafeLowRewardSatoastis , false) ;

        });


      //submit the relay packet - use ganache

      /*

      it('checks for burned signature as true  ', async function() {

      //  console.log('methodd',ContractInterface.getWalletContract(web3,'test'))
          var response = await ContractInterface.getWalletContract(web3,'test').signatureBurned.call('0x8e527391a81f77244bf95df58737eecac386ab9a47acd21bdb63757adf71ddf878169c18e4ab7b71d60f333c870258a0644ac7ade789d59c53b0ab75dbcc87d11b')

          assert.equal( response  , true  );

      });

      */




  });
