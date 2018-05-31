
var EthGasOracle = require('../lib/eth-gas-oracle');

var assert = require('assert');
describe('Array', function() {

  describe(' gas oracle ', function() {
    it('should get an HTTP response', function() {

      var gasData = EthGasOracle.getGasData();

      console.log(gasData)

      assert.ok( gasData  );

    });

  });
});
