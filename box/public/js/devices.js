/**
 * devices.js
 * 
 * Defines the packaged app's functionality for finding, connecting
 * to, and communicating with the supported devices.
 *
 */

// Extend the namespace
var bt = bt || {};
bt.devices = {};

/**
 * devices()
 * 
 * Define the devices module.
 * 
 */
bt.devices = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.devices().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************
    var device_names = {};
    var powered = false;
    var socket = {};

    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************


    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt namespace.
    // ************************************************************************

    /**
     * initialize()
     *
     */
    bt.devices.initialize = function() {

	// Use the google chrome serial API to setup listeners for
	// receiving serial data or errors.  
	chrome.serial.onReceive.addListener(function(info){
	    
	    var dv = new DataView(info.data);

	    for(var i = 0; i < info.data.byteLength; i++) {
		console.log(String.fromCharCode(dv.getInt8(i)));
	    }

	    // bt.data.log(info);

	});

	chrome.serial.onReceiveError.addListener(function(info){console.log(info);});

    }

    /**
     * scan()
     *
     * Scan for local serial devices and ask the ui to list them
     * for the user.
     */
    bt.devices.scan = function(){
	
	// Use the google chrome serial API to get information about
	// serial devices on the system.
	chrome.serial.getDevices(function(array){	    
	    bt.ui.displayLocals(array);
	});

    }

    /**
     * configure
     *
     * Given an array of device paths, deviceArray, and a action
     * (expressed as a string), configure each device in the device
     * array according the the requested action.
     *
     * For example configure(['/dev/ttyACM0'], 'connect') will
     * attempt to establish a connection with the device
     * at the path '/dev/ttyACM0'.
     */
    bt.devices.configure = function(deviceArray, action) {
	if(action === 'connect') {
	    bt.devices.connect(deviceArray[0]);
	}
    }

    /**
     * connect()
     * 
     * Establish a connection between this machine and the device
     * specified by the pathname provided, e.g. '/dev/ttyACM0'.
     */
    bt.devices.connect = function(device) {

	console.log("Invoking connect");
	
	// Create a 1-byte array buffer and put an 'm' in it.
	// TODO: This doesn't seem to write an 'm' to the ArrayBuffer.
	var data = new ArrayBuffer(1);
	var dv = new DataView(data);
	dv.setInt8(0,'m');


	// Create connection options.
	var options = {"persistent": false, 
		       "name": "dht22",
		       "bufferSize": 10,
		       "bitrate": 115200,
		       "receiveTimeout": 10000,
		       "ctsFlowControl": true};
	

	// Connect to the device supplied by this function's parameter, 'device'.
	chrome.serial.connect(device, options, function(ci) {
	    chrome.serial.send(ci.connectionId, data, function(sendInfo){console.log(sendInfo);});
	    

	});

	// TODO: Need to close the connection so that the device isn't
	// locked on the machine.  Closing CHROME (not just the chrome
	// app) altogether makes this possible, but there should be 
	// a graceful way.
    }

} // end bt.devices module


// Invoke module.
bt.devices();
