
const $ = require('jquery');
import Vue from 'vue';


const relayConfig = require('../../../relay.config').config
var io = require('socket.io-client');


var app;
var dashboardData;


var solutiontxlist;
var transfertxlist;
var jumbotron;

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


      this.socket.on('activeTransactionData', function (data) {
      //  console.log('got transactionData', JSON.stringify(data));

      var solution_list = [];
      var transfer_list = [];

          data.sort(function(a, b) {
              return b.block - a.block;
            });

        for(var i in data )
        {
          var formattedStatus =  self.getFormattedStatus(data[i].receiptData)
          data[i].formattedStatus = formattedStatus;

          if(formattedStatus == '?'){formattedStatus = 'unknown'}
          data[i].htmlClass = "tx-row status-"+ formattedStatus;

          if(data[i].txHash){
            data[i].txURL = ("https://etherscan.io/tx/"+ data[i].txHash.toString());
          }




          if( data[i].txType=='solution'  )
          {
            solution_list.push( data[i] )
          }
          if( data[i].txType=='transfer'  )
          {
            transfer_list.push( data[i] )
          }

        }

      // console.log('got transactionData', JSON.stringify(data));



       Vue.set(solutiontxlist.transactions, 'tx_list',  solution_list.slice(0,25) )
       Vue.set(transfertxlist.transactions, 'tx_list',  transfer_list.slice(0,25) )

      });

      this.socket.on('relayData', function (data) {

        console.log('relay data ', data )


          Vue.set(jumbotron.pool, 'poolData',  data )

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
    //
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
       //

    }

   

}
