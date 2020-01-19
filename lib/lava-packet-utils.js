
var ethSigUtil = require('eth-sig-util')
 const web3utils =  require('web3-utils');
   const ethjsutil = require('ethereumjs-util')
  var EIP712HelperV3 = require('./EIP712HelperV3')

module.exports = class LavaPacketUtils  {



      static getLavaPacket(
        method,relayAuthority,from,to,walletAddress,tokenAddress,tokenAmount,
        relayerReward,expires,nonce,signature)
      {

        return {
          method:method,
          relayAuthority: relayAuthority,
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


      }


  //get the signature !!
   static signTypedData(typedDataHash, privateKey )
  {

    //const msgHash = ethSigUtil.typedSignatureHash(msgParams.data)
    console.log('msghash1',typedDataHash)


    var privKey = Buffer.from(privateKey, 'hex')

    var bufferToSign = Buffer.from(typedDataHash , 'hex')


    const sig = ethjsutil.ecsign(bufferToSign, privKey)
    return ethjsutil.bufferToHex(ethSigUtil.concatSig(sig.v, sig.r, sig.s))

  }


  static lavaPacketHasValidSignature(packetData){


    //this is borked
    var sigHash = LavaPacketUtils.getLavaTypedDataHashFromPacket(packetData);
    var hashBuf = ethjsutil.toBuffer(sigHash)

    var msgBuf = ethjsutil.toBuffer(packetData.signature)
    const res = ethjsutil.fromRpcSig(packetData.signature);


    const pubKey  = ethjsutil.ecrecover(hashBuf, res.v, res.r, res.s);
    const addrBuf = ethjsutil.pubToAddress(pubKey);
    const recoveredSignatureSigner    = ethjsutil.bufferToHex(addrBuf);


    //make sure the signer is the depositor of the tokens
    return packetData.from.toLowerCase() == recoveredSignatureSigner.toLowerCase();

  }

  static getLavaTypedDataHashFromPacket(packetData)
  {

    var typedData = LavaPacketUtils.getLavaTypedDataFromParams(
       packetData.method,
       packetData.relayAuthority,
       packetData.from,
       packetData.to,
       packetData.walletAddress,
       packetData.tokenAddress,
       packetData.tokenAmount,
       packetData.relayerReward,
       packetData.expires,
       packetData.nonce);

     const types = typedData.types;


    return LavaPacketUtils.getLavaTypedDataHash(typedData,types);
  }


  static getLavaTypedDataHash(typedData )
  {
    console.log('got typeddata', typedData)

    var typedDataHash = web3utils.sha3(
        Buffer.concat([
            Buffer.from('1901', 'hex'),
            EIP712HelperV3.structHash('EIP712Domain', typedData.domain, typedData.types),
            EIP712HelperV3.structHash(typedData.primaryType, typedData.message, typedData.types),
        ]),
    );

    console.log('meep 1', EIP712HelperV3.structHash('EIP712Domain', typedData.domain, typedData.types))
    console.log('meep 2', EIP712HelperV3.structHash(typedData.primaryType, typedData.message, typedData.types))
    return typedDataHash;
  }

  static getLavaTypedDataFromParams(   methodName,relayAuthority,from,
    to,walletAddress,tokenAddress, tokenAmount, relayerRewardTokens,expires,nonce )
  {
    const typedData = {
            types: {
                EIP712Domain: [
                    { name: "contractName", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                LavaPacket: [
                    { name: 'methodName', type: 'string' },
                    { name: 'relayAuthority', type: 'address' },
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'wallet', type: 'address' },
                    { name: 'token', type: 'address' },
                    { name: 'tokens', type: 'uint256' },
                    //{ name: 'relayerRewardToken', type: 'address' },
                    { name: 'relayerRewardTokens', type: 'uint256' },
                    { name: 'expires', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' }
                ],
            },
            primaryType: 'LavaPacket',
            domain: {
                contractName: 'Lava Wallet',
                version: '1',
                chainId: 1,  // change me
                verifyingContract: walletAddress
            },
            message: {
                methodName: methodName,
                relayAuthority: relayAuthority,
                from: from,
                to: to,
                wallet: walletAddress,
                token: tokenAddress,
                tokens: tokenAmount,
             //   relayerRewardToken: relayerRewardToken,
                relayerRewardTokens: relayerRewardTokens,
                expires: expires,
                nonce: nonce
            }
        };





      return typedData;
  }


  /* static getLavaPacketSchemaHash()
   {
      var hardcodedSchemaHash = '0x7f26c13c2ea31a1d9075cc8892253274819e82361aadc3f5b2cc57bba41d146c' ;
      return hardcodedSchemaHash;
   }*/

/*
   static getLavaParamsFromData(methodName,relayAuthority,from,to,walletAddress,tokenAddress,tokenAmount,relayerReward,expires,nonce)
   {
       var params = [

        {
          type: 'bytes',
          name: 'method',
          value: method
        },
         {
           type: 'address',
           name: 'from',
           value: from
         },
         {
           type: 'address',
           name: 'to',
           value: to
         },
         {
           type: 'address',
           name: 'walletAddress',
           value: walletAddress
         },
         {
           type: 'uint256',
           name: 'tokenAmount',
           value: tokenAmount
         },
         {
           type: 'uint256',
           name: 'relayerReward',
           value: relayerReward
         },
         {
           type: 'uint256',
           name: 'expires',
           value: expires
         },
         {
           type: 'uint256',
           name: 'nonce',
           value: nonce
         },
       ]

       return params;
   }

*/



  static formatAmountWithDecimals(amountRaw,decimals)
    {
    var amountFormatted = amountRaw / (Math.pow(10,decimals) * 1.0)


    return amountFormatted;
  }

  static getRandomNonce()
  {
    return web3utils.randomHex(16)
  }




      static getContractLavaMethod(lavaContract,packetData)
      {

        var lavaTransferMethod;


        if(packetData.method == 'transfer')
        {
          lavaTransferMethod = lavaContract.methods.transferTokensWithSignature(
           packetData.method,
           packetData.relayAuthority,
           packetData.from,
           packetData.to,
           packetData.tokenAddress,
           packetData.tokenAmount,
           packetData.relayerReward,
           packetData.expires,
           packetData.nonce,
           packetData.signature
         );

      }else
      {
        lavaTransferMethod = lavaContract.methods.approveAndCallWithSignature(
          packetData.method,
          packetData.relayAuthority,
          packetData.from,
          packetData.to,
          packetData.tokenAddress,
          packetData.tokenAmount,
          packetData.relayerReward,
          packetData.expires,
          packetData.nonce,
          packetData.signature
       );
      }

        return lavaTransferMethod;

      }


    /*  static getFunctionCall(web3,packetData)
      {



        var txData;


        if(packetData.method == 'transfer')
        {
          txData  = web3.eth.abi.encodeFunctionCall({
                    name: 'transferTokensFromWithSignature',
                    type: 'function',
                    "inputs": [
                      {
                        "name": "from",
                        "type": "address"
                      },
                      {
                        "name": "to",
                        "type": "address"
                      },
                      {
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "name": "tokens",
                        "type": "uint256"
                      },
                      {
                        "name": "relayerReward",
                        "type": "uint256"
                      },
                      {
                        "name": "expires",
                        "type": "uint256"
                      },
                      {
                        "name": "nonce",
                        "type": "uint256"
                      },
                      {
                        "name": "signature",
                        "type": "bytes"
                      }
                    ]
                }, [
                    packetData.from,
                    packetData.to,
                    packetData.tokenAddress,
                    packetData.tokenAmount,
                    packetData.relayerReward,
                    packetData.expires,
                    packetData.nonce,
                    packetData.signature
              ]);

       }else if(packetData.method == 'withdraw')
        {
          txData  = web3.eth.abi.encodeFunctionCall({
                    name: 'withdrawTokensFromWithSignature',
                    type: 'function',
                    "inputs": [
                      {
                        "name": "from",
                        "type": "address"
                      },
                      {
                        "name": "to",
                        "type": "address"
                      },
                      {
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "name": "tokens",
                        "type": "uint256"
                      },
                      {
                        "name": "relayerReward",
                        "type": "uint256"
                      },
                      {
                        "name": "expires",
                        "type": "uint256"
                      },
                      {
                        "name": "nonce",
                        "type": "uint256"
                      },
                      {
                        "name": "signature",
                        "type": "bytes"
                      }
                    ]
                }, [
                    packetData.from,
                    packetData.to,
                    packetData.tokenAddress,
                    packetData.tokenAmount,
                    packetData.relayerReward,
                    packetData.expires,
                    packetData.nonce,
                    packetData.signature
              ]);

       }else if(packetData.method == 'approve')
       {
         txData  = web3.eth.abi.encodeFunctionCall({
                   name: 'approveTokensFromWithSignature',
                   type: 'function',
                   "inputs": [
                     {
                       "name": "from",
                       "type": "address"
                     },
                     {
                       "name": "to",
                       "type": "address"
                     },
                     {
                       "name": "token",
                       "type": "address"
                     },
                     {
                       "name": "tokens",
                       "type": "uint256"
                     },
                     {
                       "name": "relayerReward",
                       "type": "uint256"
                     },
                     {
                       "name": "expires",
                       "type": "uint256"
                     },
                     {
                       "name": "nonce",
                       "type": "uint256"
                     },
                     {
                       "name": "signature",
                       "type": "bytes"
                     }
                   ]
               }, [
                   packetData.from,
                   packetData.to,
                   packetData.tokenAddress,
                   packetData.tokenAmount,
                   packetData.relayerReward,
                   packetData.expires,
                   packetData.nonce,
                   packetData.signature
             ]);

      }else
      {
        txData  = web3.eth.abi.encodeFunctionCall({
                  name: 'approveAndCall',
                  type: 'function',
                  "inputs": [
                    {
                      "name": "method",
                      "type": "bytes"
                    },
                    {
                      "name": "from",
                      "type": "address"
                    },
                    {
                      "name": "to",
                      "type": "address"
                    },
                    {
                      "name": "token",
                      "type": "address"
                    },
                    {
                      "name": "tokens",
                      "type": "uint256"
                    },
                    {
                      "name": "relayerReward",
                      "type": "uint256"
                    },
                    {
                      "name": "expires",
                      "type": "uint256"
                    },
                    {
                      "name": "nonce",
                      "type": "uint256"
                    },
                    {
                      "name": "signature",
                      "type": "bytes"
                    }
                  ]
              }, [
                  packetData.method,
                  packetData.from,
                  packetData.to,
                  packetData.tokenAddress,
                  packetData.tokenAmount,
                  packetData.relayerReward,
                  packetData.expires,
                  packetData.nonce,
                  packetData.signature
            ]);

      }



            return txData;
      }*/



}
