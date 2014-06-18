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


    }

    /**
     * connect()
     * 
     */
    bt.devices.connect = function() {


	// Use the google chrome serial API to setup listeners for
	// receiving serial data or errors.  For now, just log received data
	// to the console.
	chrome.serial.onReceive.addListener(function(info){
	    
	    var dv = new DataView(info.data);

	    for(var i = 0; i < info.data.byteLength; i++)
		{
		    console.log(String.fromCharCode(dv.getInt8(i)));
		}
	    });


	chrome.serial.onReceiveError.addListener(function(info){console.log(info);});


	// Use the google chrome serial API to get information about
	// serial devices on the system.
	chrome.serial.getDevices(function(array){
	    for(var i = 0; i < array.length; i++) {
		console.log(array[i].path);
	    }

	    bt.ui.displayLocals(array);
	});
	
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
	

	// Using this call to connect to the bluetooth shield seems
	// somewhat successful in that the "Conn" LED on the board
	// blinks faster after this call, indicating that the hardware
	// believes it is connected.
	chrome.serial.connect("/dev/cu.AdafruitEZ-Link237e-SPP", options, function(ci) {
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
