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

	// Use the google chrome serial API to get information about
	// serial devices on the system.
	chrome.serial.getDevices(function(array){
	    for(var i = 0; i < array.length; i++) {
		console.log(array[i].path);
	    }

	    bt.ui.displayLocals(array);
	});
    }

} // end bt.devices module


// Invoke module.
bt.devices();
