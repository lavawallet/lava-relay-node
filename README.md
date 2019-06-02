## Lava Relay Node

This is a relay server that forwards Lava Packets for the Lava ERC20 Proxy Token for 0xBTC.  

This server pays the gas for users ethereum TX by collecting an incentivization fee of tokens and uses EIP712

## How to run a relay

* Clone this project
* Make sure you have NodeJS 8 installed and working (node -v)
* Run 'npm install' to install dependencies

(You may need to install build-essential with 'apt install build-essential' and may need to rebuild node-sass with 'rebuild node-sass depending on version of linux)

* Copy 'sample.relay.config.js' to 'relay.config.js' and configure as desired
* Copy 'sample.account.config.js' to 'account.config.js' and add your relay account keys.
* Add a small amount of ETH to the relay account so it can submit tx

* Run 'npm run webpack' to compile web files
* Run 'npm run relay'


## How to create and verify lava packets in your own apps 

https://github.com/admazzola/lava-packet-utils



 
