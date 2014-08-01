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
		   "bitrate": 9600,
		   "ctsFlowControl": false};
   
    // Important note related to the Google serial API.  Timeout
    // doesn't mean what you think it means.  Timeout seems to mean,
    // "if I didn't receive in x ms, then forget it."

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
	this.connected = connected;  
	this.ci = ci;
	this.name = name;


	// A device has a set of ports.  Each port may be empty or
	// may be connected to a sensor.  When a device is added,
	// it is automatically determined which ports are installed
	// with a sensor.  As this information is determined, this
	// object is populated.
	this.ports = {};

	// The default period for a daq is 2 seconds.  The 'period'
	// represents what the period of the daq is *currently*.
	this.period = 2;

	// There is currently no experiment registered for this daq.
	this.experiment = false;

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



	// The protocol object is what is used to send the 
	// daq commands and receive daq responses for the device.
	this.protocol = new bt.protocol.miniSDI12(path, ci);
    };

    // Update the prototype for all devices of type daq who share the
    // same methods.
    daq.prototype.refresh = refresh;
    daq.prototype.disconnect = disconnect;
    daq.prototype.set = set;
    daq.prototype.unset = unset;
    daq.prototype.setup = setup;
    daq.prototype.remove = remove;
    daq.prototype.go = go;
    daq.prototype.query = query;


    /**
     * refresh()
     *
     * Invoked on a daq object, this method pings the physical device
     * to manually get a response.
     *
     */
    function refresh(){

	// Send the command to get 1 measurement.
	var p = this.protocol.getMeasurements(1);

	// Handle the asynchronous result. 
	p.then(function(response) {

	    if (response.result === "Success") {
		bt.ui.log(response.raw);
	    }
	    
	}, function(error) {
	    console.error("Failed", error);
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
	// upon.  This 'this' gets lost in the callback function...
	var d = this;

	chrome.serial.disconnect(this.ci.connectionId, function(result){
	
	    // Indicate that the device is disconnected.
	    bt.ui.indicate(d.path,'disconnected');	
	    bt.ui.info(d.path + ' is disconnected');

	    if(clean) {
	    	// Delete it from the local registry.
		locals[d.path] = undefined;
	    }
	    else {
		// Reflect the disconnected state in the object.
		d.unset();
	    }
	});

    };

    /**
     * set()
     *
     * Invoked on a daq object, this method allows one to set 
     * the connection information for the daq and its underlying protocol.
     *
     * @param ci The connection information.
     *
     */
    function set(ci) {
	this.ci = ci;
	this.connected = true;
	this.protocol.ci = ci;
    }

    /**
     * unset()
     *
     * Invoked on a daq object, this method allows one to clear
     * the connection information for the daq and its underlying protocol.
     *
     */
    function unset() {
	this.ci = undefined;
	this.connected = false;
	this.protocol.ci = undefined;
    }

    /**
     * setup()
     *
     * Invoked on a daq object, this method allows one to set 
     * the period and duration of an experiment.
     *
     * @param period The desired period for the daq, expressed in seconds.
     *
     * @param duration The desired duration for the experiment,
     * expressed in seconds.
     *
     */
    function setup(period, duration) {
	
	this.experiment_period = period;
	this.experiment_duration = duration;
	
	// calculate number of measurements needed.  Take the ceiling
	// of the duration divided by the period.  This way, it will
	// be at least 1.
	this.experiment_measurements = Math.ceil(duration / period);

	// Configure the period for the device, if necessary.  Do it
	// now so that future operations are more deterministic.
	
	// Is the desired period the current one?  If so, done.  Return
	// an immediately resolved promise and empty success response.
	if( this.experiment_period === this.period) {

	    return new Promise(function(resolve, reject) {
		var ro = new bt.protocol.response();
		ro.type = "NA";
		ro.result = "Success";
		resolve(ro);	
	    });
	}

	// Otherwise, configure the period on the device.
	else {

	    // Send an initial message to the device.
	    var p = this.protocol.configurePeriod(this.experiment_period);
	    var path = this.path;

	    return p;
	}
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
     * Invoked on a daq object, this method begins an experiment for
     * the device.
     *
     * @param logging Indicates the logging style desired for the
     * experiment.  "pc" indicates logging data on application only
     * and "daq" indicates logging data on the application and the daq
     * itself.
     *
     */
    function go(logging) {

	console.log("here!");

	// Indicate that an experiment is running on this device.
	this.running = true;

	// There are two types of experiments; those that log on the daq, and
	// those that don't.  Start the experiment based on the kind of logging
	// indicated by the user.

	if (logging === 'pc') {

	    // Get continuous measurements from the daq.
	    var p = this.protocol.getMeasurements(this.experiment_measurements);
	    var path = this.path;

	    // Handle the asynchronous result. 
	    p.then(function(response) {

		this.running = false;		

		if (response.result === "Success") {
		    bt.ui.log(response.raw);
		}
	    
	    }, function(error) {
		console.error("Failed", error);
	    });
	}
	else if (logging === 'daq') {

	    var p = this.protocol.startMeasurements(this.experiment_measurements);
	    var path = this.path;

	    // Handle the asynchronous result. 
	    p.then(function(response) {

		if (response.result === "Success") {
		    this.running = true;
		    bt.ui.info('The experiment has started on ' + path + '.');		
		    // TODO.
		    // The experiment has begun.  It's time to turn on
		    // the connectivity manager which will make sure
		    // that the devices are responding with the
		    // expected regularity and make sure that they
		    // stay connected.  This should be done at the
		    // experiment level, not the device level.
		}
	    
	    }, function(error) {
		console.error("Failed", error);
		this.running = false;		
	    });

	}

	
	
    }

    /**
     * query()
     *
     * Invoked on a daq object, this function returns the timestamp at
     * which the software object last received data from its physical
     * counterpart.
     *
     * @returns The number of seconds since Jan 1, 1970 when a
     * complete response was received from the physical daq.
     */ 
    function query() {
	return this.protocol.lasttime;
    }

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
	    d.protocol.receive(info);
	}
	else {
	    // TODO: Fix this error!
	    bt.ui.error("Received data from unregistered connection.  This can happen if you have two instances of the app running or you accidentally clicked the '+' button twice.  Just click 'x' and reconnect.");
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

	// ADD: Add a device to the local registry and establish a
	// serial connection between the selected a device and the
	// box.
	//
	else if(action === 'connect') {

	    // If the device hasn't been registered yet, connect.
	    if(d === null) {
	    	bt.ui.error("Currently connecting to device.  Please wait.");
	    }

	    else if(d === undefined) {
		bt.devices.connect(pathArray[0]);
	    }

	    // Determine if the device is already connected.  Let's not connect
	    // a single device more than once.
	    else if(d.connected) {
		bt.ui.error("The device is already enabled.");
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
		bt.ui.error("The device has not been enabled.  Please enable the device before configuring an experiment");

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
	// var data = '0R1!;';

	// Are we currently attempting to connect to this path?  Check
	// the registry before proceeding.
	if (locals[path] === null) {
	    bt.ui.error("Currently connecting to " + path + ". Please wait.");
	    return;
	}

	// Register the path we are about to connect.  Set it's
	// object to null and provide some information to the user.
	locals[path] = null;
	bt.ui.info("Connecting to " + path + "...  Takes about 10 seconds.");
	
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
		locals[path] = undefined;
		bt.ui.error(path + " is not available for connection.  Perhaps it must be turned on?");
	    }
	    
	    else {

		// It may be that we are trying to connect a device
		// that hasn't been locally registered.
		var d = locals[path];

		console.log("In connect: ", path, d);

		// If the device hasn't been locally registered yet,
		// create an associated object for it and register it.
		if(d === null) {

		    // Create a software representation of the data acquisition unit
		    //that has just been connected to over the serial line.
		    d = bt.devices.register(path, false);
		}

		// Set the registered device's connectivity
		// information.		
		d.set(ci);

		// Send an initial message to the device.
		var p = d.protocol.acknowledge(0);

		// Handle the asynchronous result. 
		p.then(function(response) {

		    console.log("In connect.then");

		    if (response.result === "Success") {
			// Indicate that the recently connected pathname is connected.
			bt.ui.indicate(path,'connected');
			bt.ui.info(path + ' is enabled.');	
		    }

		}, function(error) {
		    console.error("Failed", error);
		});
	

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

	console.log("register() complete");
	console.log(d);

	return d;
    }

} // end bt.devices module

// Invoke module.
bt.devices();
