

const relayConfig = require('../../../relay.config').config



export default class TokenUtils {

    static getAllTokensData(  )
    {
      var tokenData = relayConfig.tokens

      tokenData.map(t => t.icon_url = "/app/assets/images/token_icons/"+t.address+".png"   )

     if(relayConfig.env == 'development')
     {
       tokenData.map(t => t.address = t.test_address   )
     }

     return tokenData;
    }

  static getTokenDataByAddress( address )
  {

      var tokenData = TokenUtils.getAllTokensData()


     /*if(typeof address == 'undefined')
     {
         return tokenData;
     }*/

     var tokenByAddress = tokenData.find(t => (t.address == address || t.test_address == address) );


     return tokenByAddress;

  }

  static getTokenAddressForEnv(tokenData)
  {
    if(relayConfig.env == 'development')
    {
      return tokenData.test_address;
    }

    return tokenData.address;
  }

  static getTokenDataBySymbol( symbol )
  {

      var tokenData = TokenUtils.getAllTokensData()


     var tokenByAddress = tokenData.find(t => (t.symbol == symbol ) );


     return tokenByAddress;

  }


  static getDecimalsOfToken(token_address)
  {

    if(token_address!= 0 && token_address.toLowerCase() == _0xBitcoinContract.blockchain_address.toLowerCase())
    {
      return 8;
    }

    return 18;

  }


  static getRawFromDecimalFormat(amountFormatted,decimals)
  {
    if(isNaN(amountFormatted)) {return amountFormatted;}

    var amountRaw = amountFormatted * Math.pow(10,decimals)

    amountRaw = Math.floor(amountRaw)
     
    return amountRaw;
  }

  static formatAmountWithDecimals(amountRaw,decimals)
  {

    if(isNaN(amountRaw)) return amountRaw;

    var amountFormatted = amountRaw / (Math.pow(10,decimals) * 1.0)

  //  amountFormatted = Math.round(amountFormatted,decimals)

    return amountFormatted;
  }


}
