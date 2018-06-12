
var ethSigUtil = require('eth-sig-util')

module.exports = class LavaUtils  {


   static getLavaParamsFromData(from,to,walletAddress,tokenAddress,tokenAmount,relayerReward,expires,nonce)
   {
       var params = [

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
           type: 'address',
           name: 'tokenAddress',
           value: tokenAddress
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


}
