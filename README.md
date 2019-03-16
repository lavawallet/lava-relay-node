## Lava Relay Node


## How to run a relay

* Clone this project
* Make sure you have NodeJS 8 installed and working (node -v)
* Run 'npm install' to install dependencies

* Copy 'sample.relay.config.js' to 'relay.config.js' and configure as desired
* Copy 'sample.account.config.js' to 'account.config.js' and add your relay account keys.
* Add a small amount of ETH to the relay account so it can submit tx

* Run 'npm run webpack' to compile web files
* Run 'npm run relay'




##### Redis Tables

  Will use a hashmap for 'peers'  (hash of ip address)

  Will use a hashmap for 'packets'


  Will make a express web interface to see the status of the mempool and peers - could be served over http or just local


### TODO

1. Render oracles them on web server
2. Allow for lava packets to be POSTed in, store them in redis, and render them on web server


## Cloudflare
The HTTP ports that Cloudflare support are:
80  --use for packets
8080  
8880
2052
2082  --use for p2p
2086  --use for websockets ?
2095  

The HTTPs ports that Cloudflare support are:
443
2053
2083
2087
2096
8443
