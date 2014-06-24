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

    // Create connection options.
    var options = {"persistent": false, 
		   "name": "dht22",
		   "bitrate": 115200,
		   "receiveTimeout": 10000,
		   "ctsFlowControl": true};
   

    // *** LOCAL DEVICES REGISTRY ***
    //  data acquisition units are registered locally according
    //  to their path.  Thus, the format is, {path: daq object}.
    locals = {}



    // ************************************************************************

    // *** DAQ OBJECT DEFINITION ***

    /** 
     * daq() 
     *
     * The daq object is the software representation of each data
     * acquisition unit connected to the app locally over a serial
     * connection.  This is the constructor for the object.
     *
     * To initialize an instance of this object requires 
     * three parts:
     *
     * @param path A full pathname representing the serial connection of
     * the local device
     *
     * @param ci Connection info created when the connection was made.
     *
     * @param name An optional diminuitive, human-readable name for
     * the device.
     */
    function daq(path, ci, name) {
	this.path = path;
	this.ci = ci;
	this.name = name;
    };

    // Update the prototype for all devices of type daq who share the
    // same methods.
    daq.prototype.refresh = refresh;
    daq.prototype.disconnect = disconnect;
    
    /**
     *
     * refresh()
     *
     * Invoked on a daq object, this method pings the physical device
     * to manually get a response.
     *
     */
    function refresh(){

	// Create a 1-byte array buffer and put an 'm' in it.
	// TODO: This doesn't seem to write an 'm' to the ArrayBuffer.
	// TODO: This needs to be a function since I'm doing it more than once.
	var data = new ArrayBuffer(1);
	var dv = new DataView(data);
	dv.setInt8(0,'m');

	chrome.serial.send(this.ci.connectionId, data, function(sendInfo){console.log(sendInfo);});
    };

    /**
     * disconnect()
     * 
     * Close the serial connection associated with a given daq.  Remove it
     * from the local registry.
     *
     */
    function disconnect() {
	
	// Retain a handle to the daq object that disconnect was invoked
	// upon.  'this' gets lost to the callback function...
	var d = this;

	chrome.serial.disconnect(this.ci.connectionId, function(result){
	    delete locals[d.path];
	});

    };

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt.devices namespace.
    // ************************************************************************

    /**
     * initialize()
     *
     * Initialize the serial connection functionality of the app.  Set
     * up the listeners that will handle serial data receive and error
     * events.
     */
    bt.devices.initialize = function() {

	// Use the google chrome serial API to setup listeners for
	// receiving serial data or errors.
	chrome.serial.onReceive.addListener(bt.data.parse);
	chrome.serial.onReceiveError.addListener(function(info){console.log(info);});
    }


    /**
     * scan()
     *
     * Scan for relevant local serial devices and ask the ui to list
     * them for the user.
     *
     * @param none
     */
    bt.devices.scan = function(){
	
	// Use the google chrome serial API to get information about
	// serial devices on the system.
	chrome.serial.getDevices(function(array){	    

	    var pruned = [];
	    var j = 0;
	    
	    // From the array of results, keep only the devices
	    // that we are explicitly interested in.

	    for(var i = 0; i < array.length; i++) {

		// If the path contains tty.Adafruit, then
		// I am interested in it.
		if(array[i].path.indexOf("/tty.Adafruit") > -1)
		    pruned[j] = array[i]; 
	    }

	    bt.ui.displayLocals(pruned);
	});
    };

    /**
     * lookup()
     *
     * Given a path, return undefined or the locally registered
     * device associated with the path
     *
     * @param path A pathname representing a local device.
     *
     * @returns the daq object locally registered with the path.
     */
    bt.devices.lookup = function(path)
    {
	return locals[path];
    }
    

    /**
     * configure()
     *
     * Given an array of device paths, pathArray, and a action
     * (expressed as a string), configure each device in the path
     * array according the the requested action.
     *
     * For example configure(['/dev/ttyACM0'], 'connect') will
     * attempt to establish a connection with the device
     * at the path '/dev/ttyACM0'.
     *
     * @param pathArray An array of paths representing local devices.
     * @param action An action to apply to all devices.
     *
     * TODO: This currently only applies the action to the first
     * device in the array.
     *
     */
    bt.devices.configure = function(pathArray, action) {

	var d = bt.devices.lookup(pathArray[0]);

	if(action === 'connect') {

	    // Determine if the device is already connected.  Let's not connect
	    // a single device more than once.
	    if(d != undefined) {
		bt.ui.error("The device is already connected.");
	    }
	    else {
		bt.devices.connect(pathArray[0]);
	    }
	}
	
	else if(action === 'refresh') {

	    if (d === undefined)
		{
		    bt.ui.error("The device is not locally connected.");
		}
	    else
	    {
		d.refresh();
	    }
	}

	else if(action === 'disconnect')
	    {
		// Determine if the device is already connected.  Let's
		// not disconnect a single device more than once.
		if(d === undefined) {
		    bt.ui.error("The device is already disconnected.");
		}
		else {
		    d.disconnect();
		}
	    }
    };

    /**
     * connect()
     * 
     * Establish a connection between this machine and the device
     * specified by the path provided, e.g. '/dev/ttyACM0'.
     */
    bt.devices.connect = function(path) {

	// Create a 1-byte array buffer and put an 'm' in it.
	// TODO: This doesn't seem to write an 'm' to the ArrayBuffer.
	var data = new ArrayBuffer(1);
	var dv = new DataView(data);
	dv.setInt8(0,'m');	

	// Connect to the device supplied by this function's
	// parameter, 'device'.  Once the connection is completed,
	// create a software representation of the local device that
	// will be used for all subsequent interactions with the
	// device.
	chrome.serial.connect(path, options, function(ci) {

	    // Handle the case where ci is undefined.  This means that
	    // the device represented by 'path' was not available for
	    // connection.
	    if (ci === undefined) {
		bt.ui.error("The device is not available for connection.  Perhaps it must be paired or turned on.");
	    }
	    
	    else {

		// Create a software representation of the data acquisition unit
		//that has just been connected to over the serial line.
		var d = new daq(path, ci);
		
		// Register the device with the local registry.
		locals[ path ] = d;
		
		// Send an initial message to the device.
		chrome.serial.send(ci.connectionId, data, function(sendInfo){console.log(sendInfo);});
	    }

	// TODO: Need to close the connection so that the device isn't
	// locked on the machine.  Closing CHROME (not just the chrome
	// app) altogether makes this possible, but there should be 
	// a graceful way.
	});

    } // end bt.devices.connect


} // end bt.devices module


// Invoke module.
bt.devices();
