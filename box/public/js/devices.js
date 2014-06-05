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

    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************
    var updateDeviceName = function(device) {

	// Update information internally.
	console.log("Updating device name:")
	console.log(device);
	device_names[device.address] = device.name;
	
	// Update information visible on the window.
	document.getElementById('device_addr').textContent = device.address;
	document.getElementById('device_name').textContent = device.name;
    };
    
    var removeDeviceName = function(device) {
	delete device_names[device.address];
    };
    
    var updateAdapterState = function(adapterInfo) {
	adapter_state = adapterInfo;
	console.log(adapter_state);
	
	if(adapter_state.available == true && adapter_state.powered == true)
	{
    	    // Connect to a very specific device and update its name
	    // in our little array.
	    chrome.bluetooth.getDevice("70:05:14:59:cc:e7", updateDeviceName);
	    
	    console.log(document.getElementById('device_list'));
	}
	else
	{
	    console.log("Bluetooth not enabled on this machine.");
	}
    };

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt namespace.
    // ************************************************************************

    bt.devices.initialize = function() {

	// Manage bluetooth devices by adding listeners to receive newly
	// found devices and updates to the previously known devices.
	chrome.bluetooth.onDeviceAdded.addListener(updateDeviceName);
	chrome.bluetooth.onDeviceChanged.addListener(updateDeviceName);
	chrome.bluetooth.onDeviceRemoved.addListener(removeDeviceName);
    }

    bt.devices.connect = function() {

	// Check and record the status of the bluetooth adapter.
	chrome.bluetooth.getAdapterState(updateAdapterState);
    }

}
bt.devices();
