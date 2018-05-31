
const $ = require('jquery');



export default class RelayDashboard {


  init(renderer)
  {
    setInterval( function(){
         renderer.update();
    },30*1000);


    renderer.init();
  }

}
