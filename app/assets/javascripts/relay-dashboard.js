
const $ = require('jquery');



export default class RelayDashboard {


  init(renderer)
  {
    setInterval( function(){
         renderer.update();
    },5*1000);


    renderer.init();
  }

}
