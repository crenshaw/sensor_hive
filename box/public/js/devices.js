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
		   "bitrate": 9600,
		   "ctsFlowControl": false};
   
    // Timeout doesn't mean what you think it means.  Timeout seems to mean, "if
    // I didn't receive in x ms, then forget it."

    // *** LOCAL DEVICES REGISTRY ***
    //
    //  data acquisition units are registered locally according
    //  to their path.  Thus, the format is, {path: daq object}.
    locals = {};

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


	// The default response for a newly created daq is the empty
	// string, as it is assumed that it hasn't replied to any
	// commands yet.
	this.response = "";
    };

    // Update the prototype for all devices of type daq who share the
    // same methods.
    daq.prototype.refresh = refresh;
    daq.prototype.disconnect = disconnect;
    daq.prototype.receive = receive;


    /**
     * refresh()
     *
     * Invoked on a daq object, this method pings the physical device
     * to manually get a response.
     *
     */
    function refresh(){

	// Create a message and place it in an ArrayBuffer.
	var data = str2ab('0R1!');

	var id = this.ci.connectionId;

	chrome.serial.send(id, data, function(sendInfo) {
	    console.log(sendInfo);
	    onSend(id); 
	});

    };


    /**
     * disconnect()
     * 
     * Invoked on a daq object, close the serial connection associated
     * with a given daq.  Remove it from the local registry.
     *
     */
    function disconnect() {
	
	// Retain a handle to the daq object that disconnect was invoked
	// upon.  'this' gets lost to the callback function...
	var d = this;

	chrome.serial.disconnect(this.ci.connectionId, function(result){
	
	    // Indicate that the device is disconnected.
	    bt.ui.indicate(d.path,'disconnected');	
	    bt.ui.info(d.path + ' is disconnected');
   
	    // Delete if from the registry.
	    delete locals[d.path];
	});

    };

    /**
     * recieve()
     *
     * receive data as it is received by Chrome over the serial line
     * from a particular DAQ. As data is received asynchronously, we
     * must handle the case that only parts of a single data report
     * may be received by a single call to this function.  Thus,
     * receive() keeps track of unparsed data received from a
     * particular DAQ until it sees a <CR><LF>.
     *
     */
    function receive(info) {

	var data = "";

	// Given an ArrayBuffer of data, construct a string and parse
	// the data.
	var dv = new DataView(info.data);

	// Make a string out of the data that was most recently received.
	// The data is cloistered in an ArrayBuffer, have ab2str() get
	// it out.
	var data = ab2str(info.data);

	console.log(data);

	this.response += data;

	// The Arduino println() function "prints data to the serial
	// port as human-readable ASCII text followed by a carriage
	// return character (ASCII 13, or '\r') and a newline
	// character (ASCII 10, or '\n')."
	var nl = this.response.indexOf('\n');

	// Is there a terminal character in the response yet?
	if(nl != -1) {
	    
	    // Chop unfinished at the terminator.  
	    // Everything before that is a finished response
	    // that needs to be parsed.
	    var finished = this.response.substring(0, nl - 1);
	    
	    // The remainder is the new unfinished response
	    this.response = this.response.substring(nl + 1);
	    	    
	    // For now, just log the raw response.
	    bt.ui.log(finished);	    
	}
    };

    /* ************************************************************** 
     * 
     * Local Utility Functions.
     */

    /**
     * ab2str()
     *
     * Convert a UTF-8 encoded ArrayBuffer to a string.
     *
     * Based on:
     * http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
     *
     * @param buf The ArrayBuffer to convert.
     *
     */
    function ab2str(buf) {
	var bufView = new Uint8Array(buf);
	var encodedString = String.fromCharCode.apply(null, bufView);
	return decodeURIComponent(escape(encodedString));
    };

    /**
     * str2ab()
     *
     * Converts a string, m, to UTF-8 encoding in a Uint8Array;
     * returns the array buffer. 
     *
     * Based on:
     * http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
     *
     * @param m The string to convert.
     */
    function str2ab(m) {

	var encodedString = unescape(encodeURIComponent(m));
	var bytes = new Uint8Array(encodedString.length);

	for (var i = 0; i < encodedString.length; ++i) {
	    bytes[i] = encodedString.charCodeAt(i);
	}

	return bytes.buffer;
    };


    /**
     * onSend()
     *
     * Invoked universally, this method flushes the serial buffer
     * represented by 'id' after sending any information.
     *
     */
    function onSend(id) {
	
	console.log("Invoking onSend() on " + id);
	
	chrome.serial.flush(id, function(result) {
	    console.log("Flushing connection");
	    console.log(result);
	  
	});

    }
    
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
	chrome.serial.onReceive.addListener(bt.devices.receive);
	chrome.serial.onReceiveError.addListener(function(info){console.log("Receive error:");  console.log(info);});
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

		var path = array[i].path;

		// If the path contains tty.Adafruit or tty.usbmodem
		// (Mac) or COM3 (Windows), then I am interested in
		// listing it for the user.
		if((path.indexOf("/tty.Adafruit") > -1)  ||
		   (path.indexOf("/tty.usbmodem") > -1)  || 
		   (path.indexOf("COM3") > -1))               {

		    pruned[j] = array[i]; 
		    j++;
		}
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
     * Given an id, return undefined or the locally registered
     * device associated with the id.
     *
     * @param info A pathname representing a local device or an
     * integer identifer representing the local connection id.
     *
     * @returns the daq object locally registered with the path.
     */
    bt.devices.lookup = function(info)
    {

	// Is the parameter a string?  Then lookup the pathname.
	if(typeof(info) === "string") {
	    return locals[info];
	}

	// Is the parameter a number?  Then lookup the connection id.
	else if(typeof(info) === "number") {
	    
	    // Iterate over all of the keys in locals.  That is,
	    // examine each daq that has been locally registered.
	    for(var key in locals){
		
		// Get the connectionId of the current object in locals.
		var d = locals[key].ci.connectionId;
		if( d === info)  {
		    return locals[key];
		}
	    }

	    // If this point is reached, no matching id was found.
	    return undefined;
	}

	// I don't recognize this type of parameter.  Sorry, Willis.
	else {
	    return undefined;
	}

    }

    /**
     * receive()
     * 
     * The publicly-available receive() function.  It determines the
     * connectionId from which the serial data was received and
     * invokes the appropriate daq's receive() function.
     *
     * @param info The serial info received by the onReceive event
     * handler.
     */
    bt.devices.receive = function(info) {

	console.log("bt.devices.receive()");

	// Determine which connection id is sending this data.
	var id = info.connectionId;
		
	// Perform a lookup.
	var d = bt.devices.lookup(id);

	// If an entry was found, receive the data.  Otherwise, log an
	// error that a foreign device is attempting to talk to us.
	// And we are shy folk.
	if(d != undefined) {
	    d.receive(info);
	}
	else {
	    bt.ui.error("Received data from unregistered connection.");
	}

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

	
	// Enforce that at least one device was selected.
	if(pathArray[0] == undefined) {
	    bt.ui.error("Please select a device.");
	    return;
	}

	var d = bt.devices.lookup(pathArray[0]);

	// Determine the action selected and invoke the appropriate
	// function.
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


	// Create a message and place it in an ArrayBuffer.
	var data = str2ab('0R1!');

	bt.ui.info("Connecting...  Takes about 10 seconds.");

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
		bt.ui.error("The device is not available for connection.  Perhaps it must be turned on?");
	    }
	    
	    else {

		// Create a software representation of the data acquisition unit
		//that has just been connected to over the serial line.
		var d = new daq(path, ci);
		
		// Register the device with the local registry.
		locals[ path ] = d;
		
		// Flush the line from any garbage that was previously in the buffer.
		//chrome.serial.flush(ci.connectionId, function(result) {

		    // Indicate that the recently connected pathname is connected.
		    bt.ui.indicate(path,'connected');
		    bt.ui.info(path + ' is connected');

		    // Send an initial message to the device.
		    chrome.serial.send(ci.connectionId, data, function(sendInfo) {
			console.log(sendInfo);
			
		    });
		//});
	    }
	});

    } // end bt.devices.connect


} // end bt.devices module

// Invoke module.
bt.devices();
