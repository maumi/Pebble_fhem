/* FHEM4PEBBLE
   Source: https://github.com/re4jh/fhem4pebble   
   modified by blubhimself to work with the
   correspondig module 98_pebble.pm and schow up Switches, FHT and FHTTK
   modified by scheisserchen65 (german layout, configuration, logo)
   modified by _Markus_ (second host, no config, new structure, updated corresponding module)
   modified by maui (auto close if no middle button is pressed for 25sec. (var timeout))
   caution: high timeouts not possible due to phone sleep
*/


// configuration:
var scheme = 'http';
var auth   = 'user:password@';
var host1   = '192.168.1.210';
var host2   = '192.168.192.42';
var port   = '8083';
var timeout = 25000;

var rooms = "3_Wohnzimmer|7_Bad|6_Balkon|2_Sensoren|5_Kueche|4_Schlafzimmer|1_Favoriten";

var timer = null;

// no configuration below:
var host = host1;

// create reg exp from comma separated list of rooms
var rooms_regex = rooms.split(",").map(Function.prototype.call, String.prototype.trim).join("|");

// Import the UI elements
var UI = require('ui');
var Vector2 = require('vector2');

// Import the AJAX elements
var AJ = require('ajax');

// Import the Vibe object
var Vibe = require('ui/vibe');

// Build and Show splash screen while waiting for data
var splashWindow = new UI.Window();

// splash screen
// var fhemSplash = new UI.Image({image: "FHEM_MED"});
var text = new UI.Text({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  text:'FHEM lokal verbinden...',
  font:'GOTHIC_28_BOLD',
  color:'white',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'black'
});

splashWindow.add(text);
splashWindow.show();

//create menu
var menu = null; // menu = new UI.Menu({sections:[]});

var singleRoomMenu = null;

var detailedDeviceMenu = null;

var fhem_url_str = scheme + '://' + host1  + ':' + port  + '/fhem';

// url connection string to FHEM Pebble Module
var url_str = encodeURI(fhem_url_str + '?cmd=pebble '+rooms_regex+'&XHR=1');

// this variable will hold the ajax response
var ajResp;

// first ajax try:
AJ({url: url_str, type: 'json'},
  read,   
  function(error, status, request) {
    console.log("Did not reach host1 ("+url_str+").");
    url_str = url_str.replace(host1, host2);
    fhem_url_str = fhem_url_str.replace(host1, host2);
    host = host2;
    console.log("Using host2 ("+url_str+").");
    
    // second try:
    AJ({url: url_str, type:'json'}, read, ajax_error);
  }
); 
  
// log standard ajax error
function ajax_error(error, status, request){
  Vibe.vibrate('long'); 
  var errMsg = 'The ajax request with "'+request+'" failed with status ' +status+ ': ' + error;
  console.log(errMsg);
  var errWind = new UI.Window();
  var text = new UI.Text({
    position: new Vector2(0, 0),
    size: new Vector2(144, 168),
    text: errMsg,
    font:'gothic-14',
    color:'white',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'black'
  });
  errWind.add(text);
  errWind.show();
}

// read json
function read(data, status, request) {    
  
  // cache ajax response (data)
  ajResp = data;
  
  menu = new UI.Menu({sections: [{ title: 'Rooms', items: ajResp.rooms }], roomIndex: 0 });
  
  //menu.on('accelTap', function(e) {
    //menu.pop();
    //menu.hide();
  //}); 
  
  /*
  menu.selection(function(e) {
       if (timer !== null)  clearTimeout(timer);
      timer = setTimeout(exit,120000);
    });
    */
   
    
  // Add a click listener for select button click on room
  menu.on('select', function(e1) {

    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(exit,timeout);
    
    // e1 = {menu: "the menu object", section: "the menu section object", sectionIndex, item: "the menu item object", itemIndex}


    // Show a card with clicked item details
    singleRoomMenu = new UI.Menu({
      sections: ajResp.rooms[e1.itemIndex].groups,
      roomIndex: e1.itemIndex // the index of the current room in the rooms-list
    });

    // Show the room
    singleRoomMenu.show();
    
    /*
    //Change selection
    singleRoomMenu.selection(function(e) {
       if (timer != null)  clearTimeout(timer);
      timer = setTimeout(exit,120000);
    });
    */
    

    // on-click on device
    singleRoomMenu.on('select', function(e2) {
      if (timer !== null)  clearTimeout(timer);
      timer = setTimeout(exit,timeout);


      // e2 = {menu: "the menu object", section: "the menu section object", sectionIndex, item: "the menu item object", itemIndex}
      
      var device = ajResp.rooms[e1.itemIndex].groups[e2.sectionIndex].items[e2.itemIndex];
      var pd = parseDevice(device);

      console.log("Blubb");
      console.log(pd.standard);
      var deviceNextState;
      if(pd.standard.length>0) {
        deviceNextState = pd.standard;  
        console.log("Standard Command set");
      }
      else {
        deviceNextState = pd.pebbleCommands.indexOf(pd.state) > -1 ? 
          (pd.pebbleCommands.indexOf(pd.state) < pd.pebbleCommands.length -1 ?
           pd.pebbleCommands[pd.pebbleCommands.indexOf(pd.state)+1] : pd.pebbleCommands[0]) : pd.pebbleCommands[0];
      }

      var switch_url_str = encodeURI(fhem_url_str + '?XHR=1&cmd.' + pd.name + '=set ' + pd.name + ' ' + deviceNextState);

      if(!pd.readOnly) {

        AJ({ url: switch_url_str, type: 'get' }, 
           function(data, status, request) { Vibe.vibrate('short'); console.log("Got " + switch_url_str); }, 
           ajax_error);

        device.subtitle = deviceNextState;
        device.state = deviceNextState;
        
        e2.menu.item(e2.sectionIndex, e2.itemIndex, device);
        
        
      }

    });

    singleRoomMenu.on('longSelect', function(e2) {

       if (timer !== null) clearTimeout(timer);
      timer = setTimeout(exit,timeout);
      // build detailed state menu

      var device = ajResp.rooms[e1.itemIndex].groups[e2.sectionIndex].items[e2.itemIndex];
      var pd = parseDevice(device);
      
      var states = [];
      pd.pebbleCommands.forEach(function(state) {
        states.push({
          switch_url: encodeURI(fhem_url_str + '?XHR=1&cmd.' + pd.name + '=set ' + pd.name + ' ' + state),
          title: state
        });
      });

      detailedDeviceMenu = new UI.Menu({sections: [{ title: pd.alias + "("+pd.state+")", items: states}] });
      detailedDeviceMenu.show();

      if(!pd.readOnly) {
        detailedDeviceMenu.on('select', function(e3) {
          if (timer !== null) clearTimeout(timer);
          timer = setTimeout(exit,timeout);
          
          AJ({ url: e3.item.switch_url, type: 'get' }, 
             function(data, status, request) { console.log("Got " + e3.item.switch_url); }, 
             function(data, status, request) { console.log("Could not get " + e3.item.switch_url); });

          e3.section.title =  pd.alias + "("+e3.item.title+")";
          device.state = e3.item.title;
          device.subtitle = e3.item.title;
          
          detailedDeviceMenu.section( e3.sectionIndex, e3.section );
          e2.menu.item(e2.sectionIndex, e2.itemIndex, device);

        });	
      }

    });

  });
  
  
  //show Menu after its loaded
  splashWindow.hide();
  timer = setTimeout(exit,timeout);
  menu.show();
}

function parseDevice(device) {

  var deviceCommands = device.webCmd && device.webCmd.length > 0 ? device.webCmd.split(":").map(Function.prototype.call, String.prototype.trim) : ['on', 'off'];
    var devicePebbleCommands = device.pebbleCmd && device.pebbleCmd.length > 0 ? device.pebbleCmd.split(":").map(Function.prototype.call, String.prototype.trim) : deviceCommands;
    var deviceReadOnly = device.pebbleReadOnly ? parseInt(device.pebbleReadOnly) : 0;
    var deviceName = device.name;
    var deviceAlias = device.alias ? device.alias.trim() : deviceName;    
    var deviceState = device.state;
    var deviceStandard = device.pebbleStandard && device.pebbleStandard.length > 0 ? device.pebbleStandard : "";
	
	return {commands: deviceCommands, pebbleCommands: devicePebbleCommands,
			readOnly: deviceReadOnly, name: deviceName, alias: deviceAlias,
          state: deviceState, standard: deviceStandard};
}

function exit() {
  //menu.pop();
  console.log("Closing App");
  if (detailedDeviceMenu !== null) detailedDeviceMenu.hide();
  if (singleRoomMenu !== null) singleRoomMenu.hide();
  if (menu !== null) menu.hide();
}


