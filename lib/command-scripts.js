// npm run cmd x


var redisInterface;




async function init()
{

  redisInterface = require('./redis-interface')
  await redisInterface.init();

  const args = process.argv;

  runCommand(args[2])

}


async function runCommand(command)
{
  console.log('cmd: '+command)

    switch(command) {
      case 'wipe_lava_packets':
          await wipeLavaPackets()
          break;

      default:
          await renderHelp()
    }

    console.log('complete!')
}

async function wipeLavaPackets()
{
  await redisInterface.deleteSetInRedis("lavapacket");
  await redisInterface.deleteSetInRedis("lavapacket_txdata");
  await redisInterface.deleteSetInRedis("queued_tx");

}

async function renderHelp()
{

}


init()
