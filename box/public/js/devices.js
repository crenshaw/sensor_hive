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
    var onConnectedCallback = function() {
	if(chrome.runtime.lastError) {
	    console.log("Connection failed: " + chrome.runtime.lastError);
	} else {
	    console.log("Connection succeeded on socketId " + socket.socketId);
	    
	    // Close the socket.
	    chrome.bluetoothSocket.disconnect(socket.socketId);
	}	
    };
    

    var updateDeviceName = function(device) {

	// Update information internally.
	console.log("Updating device name:")
	console.log(device);
	device_names[device.address] = device.name;
	
	// Update information visible on the window.
	document.getElementById('device_addr').textContent = device.address;
	document.getElementById('device_name').textContent = device.name;

	// Attempt to create a socket and connect.
	chrome.bluetoothSocket.create(function(createInfo) {
	    socket = createInfo;
	    chrome.bluetoothSocket.connect(createInfo.socketId, device.address, "1105", onConnectedCallback);
	});

    };
    
    var removeDeviceName = function(device) {
	delete device_names[device.address];
    };

    var addDeviceName = function(device) {
	console.log("onDeviceAdded event fired.");
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

    /**
     * initialize()
     *
     * Initialize the bluetooth module be adding listeners for the onDeviceAdded,
     * onDeviceChanged, and onDeviceRemoved events provided by Chrome.
     */
    bt.devices.initialize = function() {

	// Add a listener to handle adapter changes.
	chrome.bluetooth.onAdapterStateChanged.addListener(
	    function(adapter) {
		if (adapter.powered != powered) {
		    powered = adapter.powered;
		    if(powered) {
			console.log("Adapter radio is on");
		    } else {
			console.log("Adapter radio is off");
		    }
		}
	    });
	
	// Manage bluetooth devices by adding listeners to receive newly
	// found devices and updates to the previously known devices.
	chrome.bluetooth.onDeviceAdded.addListener(addDeviceName);
	chrome.bluetooth.onDeviceChanged.addListener(updateDeviceName);
	chrome.bluetooth.onDeviceRemoved.addListener(removeDeviceName);
    }

    /**
     * connect()
     * 
     * Quoted from Google documentation at
     *    https://developer.chrome.com/apps/app_bluetooth
     * 
     * "In order to make a connection to a device you need three things.  A socket
     * to make a connection with, created using bluetoothSocket.create"; the address
     * of the device you with to connect to, and the UUID of the service itself."
     *
     */
    bt.devices.connect = function() {

	// Check and record the status of the bluetooth adapter.
	chrome.bluetooth.getAdapterState(updateAdapterState);
    }

}
bt.devices();
