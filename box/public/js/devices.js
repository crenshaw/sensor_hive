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
     * @param connected A boolean value indicating whether the device is
     * connected to the box.
     *
     * @param ci The optional connection info created.  Required if
     * the connection has already been made.  For example, a daq may
     * be created for an unconnected device.  In such a case, this
     * parameter is not required.
     *
     * @param name An optional diminuitive, human-readable name for
     * the device.
     */
    function daq(path, connected, ci, name) {
	this.path = path;
	this.connected = connected;  // True/False, is the device
				   // connected?
	this.ci = ci;
	this.name = name;

	// The default period for a daq is 2 seconds.  The 'period'
	// represents what the period of the daq is *currently*.
	this.period = 2;

	// The default period and total duration for an experiment is
	// 0 seconds.  The 'experiment_period' of a daq represents
	// what the desired period for this experiment is.  This value
	// may differ from the 'period' since the experiment may not
	// have been run and the daq have not been configured yet.
	this.experiment_period = 0;
	this.experiment_duration = 0;

	
	this.experiment_measurements = 0;
	this.experiment_collected = 0;

	// Is an experiment running right now?
	this.running = false;

	// The default response for a newly created daq is the empty
	// string, as it is assumed that it hasn't replied to any
	// commands yet.
	this.response = "";

	// The response object is the parsed version of the response.
	// To save on memory performance, each daq has a single
	// response object since only one response is examined at a
	// time.  After decided how to react to the response, the
	// object is cleared and reused.  For now, it is undefined.
	this.ro = new bt.miniSDI12.response();

	// The last command issued to this daq.
	this.lastCommand = "";
    };

    // Update the prototype for all devices of type daq who share the
    // same methods.
    daq.prototype.refresh = refresh;
    daq.prototype.send = send;
    daq.prototype.disconnect = disconnect;
    daq.prototype.receive = receive;
    daq.prototype.setup = setup;
    daq.prototype.remove = remove;
    daq.prototype.go = go;
    daq.prototype.processResponse = processResponse;


    /**
     * refresh()
     *
     * Invoked on a daq object, this method pings the physical device
     * to manually get a response.
     *
     * TODO: Remove hard-coded command!
     */
    function refresh(){
	this.lastCommand = '0R1!';
	this.send('0R1!');
    };


    /**
     * send()
     *
     * Invoked on a daq object, this method sends the physical device
     * the supplied command.
     *
     * @param c The command to send.
     */
    function send(c){

	this.lastCommand = c;

	// Create a message and place it in an ArrayBuffer.
	var data = str2ab(c);

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
     * with a given daq.  If 'clean' is true, disconnect the device
     * "cleanly" by removing if from the local registry.
     *
     * @param clean A boolean value.  If true, disconnect the device
     * and ALSO remove it from the locally registry.  Otherwise, just
     * disconnect the device.
     *
     */
    function disconnect(clean) {
	
	// Retain a handle to the daq object that disconnect was invoked
	// upon.  'this' gets lost to the callback function...
	var d = this;

	chrome.serial.disconnect(this.ci.connectionId, function(result){
	
	    // Indicate that the device is disconnected.
	    bt.ui.indicate(d.path,'disconnected');	
	    bt.ui.info(d.path + ' is disconnected');

	    if(clean) {
	    	// Delete it from the local registry.
		d.remove();
	    }
	    else {
		// Reflect the disconnected state in the object.
		d.connected = false;
		d.ci = undefined;
	    }
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

	    //bt.ui.log(finished);	 
	    var t = bt.miniSDI12.timestamp(finished);
	    	    
	    // TODO: Stumbled upon a bizarre bug in which two quick
	    // calls to bt.ui.log see only the first call actually
	    // working.  Moreover, it seems that code that occurs
	    // after bt.ui.log() isn't getting called.  Hm.  I can
	    // recreate the problem if I just place a call to
	    // bt.ui.log() in one of the existing commented-out
	    // places.
	    //
	    // It also seems like I can't put any code after
	    // the call to bt.ui.log().  Hm.  

	    // Process the timestamped response.
	    this.processResponse(t)

	    //bt.ui.log(finished);

	    // **** bt.ui.log(t);
	    
	}
    };

    /**
     * setup()
     *
     * Invoked on a daq object, this method allows one to set 
     * the period and duration of an experiment.
     *
     * @param period The desired period for the daq.
     * @param duration The desired duration for the experiment.
     *
     * TODO: Need to incorporate units into this.
     *
     */
    function setup(period, duration) {
	
	this.experiment_period = period;
	this.experiment_duration = duration;
	
	// calculate number of measurements needed.  Right now, we've got
	// seconds as the hard-coded units of measure.  Take the ceiling
	// of the duration divided by the period.  This way, it will
	// be at least 1.
	this.experiment_measurements = Math.ceil(duration / period);

	return;
    }

    /** 
     * remove()
     *
     * Invoked on a daq object, this method removes the daq from
     * the local registry
     */
    function remove() {

	var path = this.path;
	delete locals[path];
	bt.ui.info("The device is no longer locally registered");
	bt.ui.indicate(path,'removed');
    }

    /**
     * go()
     *
     * Invoked on a daq object, this method begins the pre-configured
     * experiment for the device.
     *
     */
    function go() {

	console.log(this);

	// Does the current period match the desired period?  If not,
	// we need to set the period on the device.
	if(this.period != this.experiment_period) {
	    
	    var p = bt.miniSDI12.makeCommand('P', 0, this.experiment_period);
	    console.log("Sending...");
	    console.log(p);
	    this.send(p);	    
	}

	else {  
	    // Otherwise, issue the most basic R command possible.
	    var c = bt.miniSDI12.makeCommand('R',0,this.experiment_measurements)
	    console.log("Sending...");
	    console.log(c);
	    this.send(c);
	}
    }

    /**
     * maintain()
     *
     * Invoked on a daq object, this method maintains an experiment,
     * continuing to issue commands over the course of an entire
     * experiment.  
     */ 
    function maintain() {



    }

    /**
     * processResponse()
     *
     * Invoked on a daq object, this method parses the response sent
     * by the daq and determines next step.
     */ 
    function processResponse(r) {

	// Parse the current response.
	bt.miniSDI12.parse(r, this.ro);

	// If the type of the response is data, just log it to the
	// window.
	if(this.ro.isData()) {
	    if(this.running && r.indexOf(':') > -1) {
		this.running = false;
		bt.ui.info('The experiment is complete.');
	    }

	    bt.ui.log(r);
	}

	// Otherwise, if the type of the response is a 'Configure
	// Period' response, send the next command for the experiment.
	else {

	    // Otherwise, issue the most basic R command possible.
	    var c = bt.miniSDI12.makeCommand('R',0,this.experiment_measurements)
	    console.log("Sending...");
	    console.log(c);
	    this.send(c);
	}

    }

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
	
//	chrome.serial.flush(id, function(result) {
//	    console.log("Flushing connection");
//	    console.log(result);
//	  
//	});

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
	    bt.ui.error("Received data from unregistered connection.  This can happen if you have two instances of the app running.");
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
	var path = pathArray[0];

	// ********************************************************
	// Determine the action selected and invoke the appropriate
	// function.

	
	// ADD: Add a device to the local registry.
	if(action === 'add') {
	    
	    // If d wasn't found, then it hasn't yet been added
	    // to the local registry.  Add it. Otherwise, tell
	    // the user it has already been registered.
	    if(d === undefined) {
		
		// Create a software representation of the data
		//acquisition unit, i.e., register it.
		var d = bt.devices.register(path, false);

	    }
	    else {
		bt.ui.error("The device is already locally registered.");
	    }
	}

	// CONNECT: Connect a device to the box.  A device does not
	// have to be added to the local registry before being
	// connected.  
	//
	// TODO: This might be confusing...  May have to
	// enfore ADD-then-CONNECT for more consistent functionality.
	else if(action === 'connect') {

	    // If the device hasn't been registered yet, connect.
	    if(d === undefined) {
		bt.devices.connect(pathArray[0]);
	    }
	    
	    // Determine if the device is already connected.  Let's not connect
	    // a single device more than once.
	    else if(d.connected) {
		bt.ui.error("The device is already connected.");
	    }
	    else {
		bt.devices.connect(pathArray[0]);
	    }
	}

	// SETUP: Associate a device with simple experiment settings including
	// period and duration.
	else if(action === 'setup') {
	    
	    // If the device hasn't been locally registered...
	    if(d === undefined) {

		// You gotta register and *then* setup.	
		var n = bt.devices.register(path, false);

		n.setup();

	    }

	    // Otherwise, just set up the experiment.
	    else {
		d.setup();
	    }
	}


	// DISCONNECT: Disconnect a locally registered device from the
	// box.  After this action, the device remains locally
	// registered.
	else if(action === 'disconnect')
	    {
		// Determine if the device is already connected.  Let's
		// not disconnect a single device more than once.
		if(d === undefined) {
		    bt.ui.error("The device is already disconnected.");
		}
		else {
		    d.disconnect(false);
		}
	    }
	

	// GO: Start the experiment.  This action requires that some
	// experiment was set up for the device.
	else if(action === 'go') {
	    		
	    if(d === undefined || d.experiment_measurements === 0) {
		bt.ui.error("No experiment has been configured for this device.");
	    }
	    else if(d.connected === false) {
		bt.ui.error("The device is not locally connected.  Please connect the device to start an experiment.");
	    }
	    else if(d.running === true) {
		bt.ui.error("An experiment is already running.  Please wait.");
	    }
	    else {
		d.running = true;
		d.go();
		bt.ui.info("Starting the experiment...");
	    }
	}


	// REFRESH: As the locally registered and connected device for
	// 1 data report.
	else if(action === 'refresh') {

	    if (d === undefined || d.connected === false) {
		    bt.ui.error("The device is not locally connected.");
		}
	    else {
		d.refresh();
	    }
	}

	// REMOVE: Remove the device from the local registry.
	else if(action === 'remove') {

	    // If the device is not currently registered, we 
	    // don't need to unregister it.
	    if(d === undefined) {
		    bt.ui.error("The device is not locally registered.");
	    }
		
	    // If the device is currently connected, we need to
	    // disconnect cleanly, i.e., disconnect it and remove
	    // it from the local registry.
	    else if(d.connected){
		d.disconnect(true);
	    }
	    // Otherwise, just remove if from the registry.
	    else {
		d.remove();
	    }
	}

	console.log(locals);
	    
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

		// It may be that we are trying to connect a device
		// that hasn't been locally registered.
		var d = locals[path];

		// If the device hasn't been locally registered yet,
		// create an associated object for it and register it.
		if(d === undefined) {

		    // Create a software representation of the data acquisition unit
		    //that has just been connected to over the serial line.
		    var n = bt.devices.register(path, true, ci);
		}

		// Otherwise, just set the registered device's
		// connectivity information.
		else {
		    d.connected = true;
		    d.ci = ci;
		}
		
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

    /**
     *
     * register
     *
     * Locally register a device.  In other words, create a local
     * object, the software representation of the device in the
     * physical world.
     *
     * @param path The pathname representing the local device to be
     * registered.
     *
     * @param connected A boolean value.  It is true if the device has
     * already been connected and false otherwise.
     *
     * @param ci If connected, the connection information for the
     * device.
     *
     * @returns The newly created daq object for the device just
     * registered.
     */
    bt.devices.register = function(path, connected, ci) {    
	
	// Create a software representation of the data acquisition unit
	//that has just been registered.
	var d = new daq(path, connected, ci);
	
	// Register the device with the local registry.
	locals[ path ] = d;
	
	// Indicate to the user that the device has been registered.
	bt.ui.indicate(path,'registered');
	bt.ui.info("The device has been locally registered.");

	return d;
    }

} // end bt.devices module

// Invoke module.
bt.devices();
