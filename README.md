## Lava Relay Node


## How to run a relay

1. Clone this project
2. Run 'yarn' to install dependencies
3. Run 'npm run webpack' to compile web files
4. Run 'npm run relay'




##### Redis Tables

  Will use a hashmap for 'peers'  (hash of ip address)

  Will use a hashmap for 'packets'


  Will make a express web interface to see the status of the mempool and peers - could be served over http or just local


### TODO

1. Render oracles them on web server
2. Allow for lava packets to be POSTed in, store them in redis, and render them on web server
