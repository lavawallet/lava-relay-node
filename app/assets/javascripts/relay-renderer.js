
const $ = require('jquery');
import Vue from 'vue';


const relayConfig = require('../../../relay.config').config
var io = require('socket.io-client');


var app;
var dashboardData;


var solutiontxlist;
var transfertxlist;
var jumbotron;
var stats;
var packetslist;
var queuedtxlist;

export default class RelayRenderer {

    init( )
    {

      var self = this;

      this.transactionListData = {
        txData: [ ]
      }


      var current_hostname = window.location.hostname;

      const socketServer = 'http://'+current_hostname+':4000';

      const options = {transports: ['websocket'], forceNew: true};
      this.socket = io(socketServer, options);


      // Socket events
      this.socket.on('connect', () => {
        console.log('connected to socket.io server');
      });


      this.socket.on('disconnect', () => {
        console.log('disconnected from socket.io server');
      });




      this.socket.on('relayData', function (data) {

          console.log('relay data ', data )

          Vue.set(stats, 'relayData',  data )

      });

      this.socket.on('lavaPackets', function (data) {

          console.log('lava packets ', data )

          Vue.set(packetslist, 'list',  data )

      });

      this.socket.on('queuedTx', function (data) {

          console.log('queued lava packets ', data )

          Vue.set(queuedtxlist, 'list',  data )

      });



      solutiontxlist = new Vue({
          el: '#solutiontxlist',
          data: {
            //parentMessage: 'Parent',
            transactions: {
              tx_list: this.transactionListData.txData
            }
          }
        })

       transfertxlist = new Vue({
            el: '#transfertxlist',
            data: {
              //parentMessage: 'Parent',
              transactions: {
                tx_list: this.transactionListData.txData
              }
            }
          })


         jumbotron = new Vue({
        el: '#jumbotron',
        data:{
          relayName: relayConfig.name
         }
      });



         stats = new Vue({
              el: '#stats',
              data:{
                relayData: {}
               }
            });

            packetslist = new Vue({
                 el: '#packetslist',
                 data:{
                   list: []
                  }
               });

           queuedtxlist = new Vue({
                el: '#queuedtx',
                data:{
                  list: []
                 }
              });


      var hashingDataSet= {
        labels: [5555,5556,5557],
        points: [0,0,0]
      }





      $('.mining-instructions-container').hide();

      $('.toggle-mining-instructions').on('click',function(){
          $('.mining-instructions-container').toggle();
      });



      console.log('Emit to websocket')
       this.socket.emit('getRelayData');
       this.socket.emit('getLavaPackets');
        this.socket.emit('getQueuedTx');
    }


    getFormattedStatus(receiptData)
    {
        if(receiptData.success) return 'success';
      if(receiptData.mined) return 'mined';
      if(receiptData.pending) return 'pending';
      if(receiptData.queued) return 'queued';
      return '?'
    }


     update(renderData)
    {

      this.socket.emit('getRelayData');
      this.socket.emit('getLavaPackets');
      this.socket.emit('getQueuedTx');

    }



}
