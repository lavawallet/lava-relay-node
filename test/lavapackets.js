
var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/gmXEVo5luMPUGPqg6mhy';

var LavaPeerInterface = require('../lib/lava-peer-interface');

var LavaPacketSubmitter = require('../lib/lava-packet-submitter');

var redisInterface = require('../lib/redis-interface')
var ContractInterface = require('../lib/contract-interface')


const LavaPacketUtils = require("../lib/lava-packet-utils");

const relayConfig = require('../relay.config').config


const lavaContractJSON = require('../contracts/LavaToken.json');
const tokenContractJSON = require('../contracts/_0xBitcoinToken.json');

const accountConfig = require('../account.config').account




var Web3 = require('web3')

var web3 = new Web3( )

web3.setProvider(new web3.providers.HttpProvider(INFURA_ROPSTEN_URL))


var assert = require('assert');

var lavaPeerInterface;


  describe('Lava Packet', function() {



    it('packet can be created', async function() {

        lavaPeerInterface = new LavaPeerInterface(redisInterface,relayConfig);

      await redisInterface.init();

      await lavaPeerInterface.init(web3);


      var packetData = {
        methodName:'transfer',
        relayAuthority:'0x0000000000000000000000000000000000000000',
        from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
        to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
        wallet:"0x434360bef02ad8734d07e85875b6d9f2d322dd52",
        tokens:200000000,
        relayerRewardTokens:100000000,
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
              methodName: 'transfer',
              relayAuthority: '0x0000000000000000000000000000000000000000',
              from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
              to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
              wallet:"0x434360bef02ad8734d07e85875b6d9f2d322dd52",
              tokens: 0 ,
              relayerRewardTokens: 0,
              expires:8365044,
              nonce:"0xc18f687c56f1b2749af7d6151fa351"
             }

             var pkey = accountConfig.privateKey;

             var packetDataHash = LavaPacketUtils.getLavaTypedDataHashFromPacket(packetData);

             var computedSig = LavaPacketUtils.signTypedData(packetDataHash,pkey)

             packetData.signature = computedSig;

             console.log('!!!!!!!!!!!sig is ', computedSig)

             var response =  LavaPacketUtils.lavaPacketHasValidSignature(packetData)

            assert.equal( response, true  );
      });


      it('checks for invalid signature', async function() {

            var packetData = {
              methodName: 'transfer',
              relayAuthority: '0x0000000000000000000000000000000000000000',
              from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
              to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
              wallet:"0x434360bef02ad8734d07e85875b6d9f2d322dd52",
              tokens: 1000 ,
              relayerRewardTokens: 0,
              expires:8365044,
              nonce:"0xc18f687c56f1b2749af7d6151fa351", //needs to be a string !!
              signature:"0x9c54e25406468f9e490ea406fb39d20e0d5c591221e53a1bb7cea6f9240f99eb514c4c15daa3a2fc56d61c1aa0e58ffb52907bacf580673e386ed63bbeb7dfc31c"
          }

          var response =   LavaPacketUtils.lavaPacketHasValidSignature(packetData)

            assert.equal( response  , false );


      });

      it('checks for burned signature as false ', async function() {

      //  console.log('methodd',ContractInterface.getWalletContract(web3,'test'))

      /*  var balance = await web3.eth.getBalance('0x434360bef02ad8734d07e85875b6d9f2d322dd52');
        console.log('BALANCE IS ', balance.toNumber())

        var contractyBoi =   web3.eth.contract(lavaContractJSON.abi,'0x434360bef02ad8734d07e85875b6d9f2d322dd52')
        console.log('cboi is ',contractyBoi)

  console.log('w31 is ', web3.eth)
      console.log('w3 is ', web3.eth.Contract)*/

      var lavaContract = ContractInterface.getLavaContract(web3,'development');
      console.log('lava contract is ', lavaContract)

          var response = await lavaContract.methods.signatureBurnStatus('0x0000000000000000000000000000000000000000').call()

          assert.equal( response  , false );

      });

        it('checks for targetSafeLowRewardTokens ', async function() {

            var testPacket = {
              methodName: 'transfer',
              relayAuthority: '0x0000000000000000000000000000000000000000',
              from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
              to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
              wallet:"0x434360bef02ad8734d07e85875b6d9f2d322dd52",
              tokens: 0 ,
              relayerRewardTokens: 0,
              expires:8365044,
              nonce:"0xc18f687c56f1b2749af7d6151fa351", //needs to be a string !!
              signature:"0x9c54e25406468f9e490ea406fb39d20e0d5c591221e53a1bb7cea6f9240f99eb514c4c15daa3a2fc56d61c1aa0e58ffb52907bacf580673e386ed63bbeb7dfc31c"
          }


              var targetSafeLowRewardTokens = (0.08);

              console.log('target safe low tokens', targetSafeLowRewardTokens)


              var targetSafeLowRewardSatoastis =  (targetSafeLowRewardTokens * (10**8) );
              // 0.0086
              console.log('target safe low satoastis', targetSafeLowRewardSatoastis)

              assert.equal( parseInt(testPacket.relayerReward) >= targetSafeLowRewardSatoastis , false) ;

        });


      //submit the relay packet - use ganache



      it('verify the typehash', async function() {

        var packetData = {
          methodName: 'transfer',
          relayAuthority: '0x0',
          from: "0xb11ca87e32075817c82cc471994943a4290f4a14",
          to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
          wallet:"0x434360bef02ad8734d07e85875b6d9f2d322dd52",
          tokens: 0 ,
          relayerRewardTokens: 0,
          expires:8365044,
          nonce:"0xc18f687c56f1b2749af7d6151fa351", //needs to be a string !!
          }

        var lavaContract = ContractInterface.getLavaContract(web3,'development');

        var contractDataHash = await lavaContract.methods.getLavaTypedDataHash(
          packetData.methodName,
          packetData.relayAuthority,
          packetData.from,
          packetData.to,
          packetData.wallet,
          packetData.tokens,
          packetData.relayerRewardTokens,
          packetData.expires,
          packetData.nonce
        ).call()

        var computedDataHash = LavaPacketUtils.getLavaTypedDataHashFromPacket(packetData);

          assert.equal( contractDataHash  , '0x' + computedDataHash.toString('hex') );

      });


      it('submit the packet', async function() {


            var packetData = {
              methodName: 'approve',
              relayAuthority: '0x0',
              from: "0xB11ca87E32075817C82Cc471994943a4290f4a14",
              to: "0x357FfaDBdBEe756aA686Ef6843DA359E2a85229c",
              wallet:"0x444360bef02ad8734d07e85875b6d9f2d322dd52",
              tokens: 0,
              relayerRewardTokens: 0,
              expires:336504400,
              nonce: LavaPacketUtils.getRandomNonce()  //needs to be a string !!

          }


          var packetDataHash = LavaPacketUtils.getLavaTypedDataHashFromPacket(packetData);

          var pkey = accountConfig.privateKey;
          var computedSig = LavaPacketUtils.signTypedData(packetDataHash,pkey)
          packetData.signature = computedSig;



          var validPacket =  LavaPacketUtils.lavaPacketHasValidSignature(packetData)
          assert.equal( validPacket  , true );

          var response =  await LavaPacketSubmitter.broadcastLavaPacket(packetData,'normal',2,accountConfig,web3,'development');
          console.log('broadcast',response)
          assert.equal( response  , true );


      });



      /*

      it('checks for burned signature as true  ', async function() {

      //  console.log('methodd',ContractInterface.getWalletContract(web3,'test'))
          var response = await ContractInterface.getWalletContract(web3,'test').signatureBurned.call('0x8e527391a81f77244bf95df58737eecac386ab9a47acd21bdb63757adf71ddf878169c18e4ab7b71d60f333c870258a0644ac7ade789d59c53b0ab75dbcc87d11b')

          assert.equal( response  , true  );

      });

      */




  });
