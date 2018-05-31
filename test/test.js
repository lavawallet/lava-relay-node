
var EthGasOracle = require('../lib/eth-gas-oracle');

var MarketOracle = require('../lib/market-oracle');

var assert = require('assert');
describe('Oracles', function() {

  describe('Gas oracle ', function() {
    it('should get an HTTP response', function() {

      var gasData = EthGasOracle.getGasData();

      console.log(gasData)

      assert.ok( gasData  );

    });

  });
  describe('Price oracle ', function() {
    it('should get an HTTP response', function() {

      var marketData = MarketOracle.getMercatoxPriceData();

      console.log(marketData)

      assert.ok( marketData  );

    });

  });
});
