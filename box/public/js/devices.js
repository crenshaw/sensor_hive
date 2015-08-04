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
	

	// A device may attempt to reconnect its serial connection.
	// If so, indicate this attempt is ongoing with .connecting
	// as true.  Otherwise, if no attempt to connect is ongoing
	// this field is false.
	this.connecting = false;

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

    // Methods that communicate with the underlying device utilizing
    // the protocol object associated with this object.
    daq.prototype.refresh = refresh;
    daq.prototype.setup = setup;
    daq.prototype.go = go;
    daq.prototype.stop = stop;

    // Methods that only alter the state of the object.
    daq.prototype.set = set;
    daq.prototype.unset = unset;
    daq.prototype.get = get;
    daq.prototype.query = query;
    daq.prototype.onRejection = onRejection;

    // Methods that utilize the chrome.serial API.
    daq.prototype.close = close;
    daq.prototype.disable = disable;


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
	var d = this;

	// Handle the asynchronous result. 
	p.then(function(response) {

	    if (response.result === "Success") {
	    }
	    else {
		bt.ui.warning("Could not test device");
	    }
	    
	}, function(error) {
	    d.onRejection(error);
	});

    }

    /**
     * stop()
     *
     * Invoked on a daq object, this method issues the break command
     * to the underlying physical device.
     *
     */
    function stop() {

	// Send the break command.
	var p = this.protocol.stop();
	var d = this;

	// Handle the asynchronous result. 
	p.then(function(response) {

	    if (response.result === "Success") {
		
		// This device is no longer running an experiment.
		bt.ui.info("Stopped " + d.path + ".");
		d.running = false;
		
	    }
	    else {
		d.running = false;
		bt.ui.warning("Could not stop " + d.path + " gracefully.");
	    }
	    
	}, function(error) {
	    d.onRejection(error);
	});	

    }


    /**
     * close()
     *
     * Invoked on a daq object, close the serial connection associated
     * with a given daq.  Keep the daq object for future communications.
     *
     */
    function close() {

	// Retain a handle to the daq object that disconnect was invoked
	// upon.  This 'this' gets lost in the callback function...
	var d = this;

	chrome.serial.disconnect(this.ci.connectionId, function(result){
	
	    // Indicate that the device is disconnected, both at the
	    // UI and at the object.
	    console.log("Unsetting connection.");
	    d.unset();
	    bt.ui.indicate(d.path,'disconnected');	

	});

    }

    /**
     * disable()
     * 
     * Invoked on a daq object, close the serial connection associated
     * with a given daq and remove it from the local registry of devices.
     *
     */
    function disable() {
	
	// Retain a handle to the daq object that disconnect was invoked
	// upon.  This 'this' gets lost in the callback function...
	var d = this;

	// Define what to do upon disabling a device.  
	function onDisable(result) {

	    // Indicate that the device is disabled.
	    bt.ui.indicate(d.path,'disabled');	
	    bt.ui.info(d.path + ' is disabled');

	    // Delete it from the local registry.
	    locals[d.path] = undefined;
        
        //display all currently registered devices
        bt.ui.displayRegistered();
	}

	// If the device isn't already disconnected, disconnect it and
	// then invoke the above-defined onDisable function.
	if (d.ci != undefined) {
	    chrome.serial.disconnect(this.ci.connectionId, onDisable);
	}
	// Otherwise, just invoke the function.
	else {
	    onDisable();
	}
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

	console.log("Set connection info for: ", this, ci);
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

	// Clear its commandQueue.
	//Arduthis.protocol.commandQueue = new Array();
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

	// Configure the period for the device.  
	
	// Send an initial message to the device.
	var p = this.protocol.configurePeriod(this.experiment_period);
	var path = this.path;

	return p;
	
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

	// Grab this for the subsequent .then() call.  In the .then() call
	// 'this' is the Window object.
	var d = this;
	var path = d.path;

	// Indicate that an experiment is running on this device.
	d.running = true;

	// There are two types of experiments; those that log on the daq, and
	// those that don't.  Start the experiment based on the kind of logging
	// indicated by the user.

	if (logging === 'pc') {

	    // Get continuous measurements from the daq.
	    console.log(d);
	    var p = d.protocol.getMeasurements(d.experiment_measurements);

	    // Handle the asynchronous result. 
	    p.then(function(response) {

		// The experiment is complete.  Indicate that an
		// experiment is no longer running on this device.
		d.running = false;		
	    
	    }, function(error) {

		// The experiment `completed` because the response
		// timed out.  While the completion was not
		// successful, we still want to indicate that an
		// experiment is no longer running on this device.
		d.running = false;
		d.onRejection(error);
	    });
	}
	else if (logging === 'daq') {

	    var p = d.protocol.startMeasurements(d.experiment_measurements);

	    // Handle the asynchronous result. 
	    p.then(function(response) {

		if (response.result === "Success") {
		    d.running = true;

		    // In the response, the DAQ indicates how long
		    // until all of the measurements will be done and
		    // how many measurements shall be taken.  Get this
		    // information and set it in the device's object.

		    // TODO: This is causing some sabotage.  Need a better
		    // way of synchronizing what the object thinks with
		    // the device's response.

		    // TODO: An abort response is registering as "success" here?

		    // d.experiment_duration = response.time;
		    // d.experiment_measurements = response.n;

		    // Set a timer.  In d.experiment_duration, the timer will
		    // go off and mark this device as not running anymore.
		    var totalTime = d.experiment_duration + 10;

		    // TODO: Need to clear this interval somewhere....
		    d.interval = setTimeout(function() { d.running = false; }, totalTime * 1000);

		    bt.ui.info('The experiment has started on ' + d.path + ' and will be completed in ' + totalTime + ' seconds');		

		    // The experiment has begun.  

		    // The experiment object to which this device is
		    // registered will do the work of managing the
		    // experiment until it is complete.  See
		    // runnable.js.
		}
		else {
		    bt.ui.error('Something is wrong with experiment configuration on device.');
		}
	    
	    }, function(error) {
		d.onRejection(error);
	    });

	}	
    }

    /**
     * get()
     *
     * Invoked on a daq object, this function issues a command to get
     * all of the backed up data on the device.
     *
     */
    function get() {

	var p = this.protocol.getLoggedData();	
	return p;
    }

    /**
     * onRejection()
     *
     * Invoked on a daq object, this function describes how to respond
     * to a rejected promise from the underlying protocol layer.
     *
     */
    function onRejection(error) {
	
	// A rejected promise supplies an object of type
	// bt.protocol.response whose .result field can be one of x
	// values: "Badly Formed Command", "Abort", "Not Connected",
	// "Overrun", "No Response".


	// "Badly Formed Command".  In some cases, commands are not allowed
	// exceed certain n values.  Ignore this problem.
	//
	// "Abort".  The DAQ replied with an abort response.
	//
	// "Not Connected."  The DAQ no longer is connected to this
	// application.
	//
	// "Overrun."  The command queue for the DAQ was overrun; this
	// means the DAQ did not reply to the last command.  Something
	// bad may have happened to our connection or our DAQ.  Quite
	// likely, the DAQ ran out of battery.
	//
	
	console.log("Promise rejected: ", error.result);

	// "No Response."  The DAQ did not respond before the expected
	// amount of time.
	if(error.result === "No Response") {
	    this.close();
	    bt.ui.warning("Lost connection on " + this.path + ".");
	    return;
	}
	
	// "Overrun."  The command queue for the DAQ was overrun; this
	// means the DAQ did not reply to the last command.  Something
	// bad may have happened to our connection or our DAQ.  Quite
	// likely, the DAQ ran out of battery.
	else if(error.result === "Overrun") {
	    
	    // Clear the command queue.
	    this.protocol.commandQueue = new Array();

	    // Attempt to get an acknowledgement from the device....
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
	
//	chrome.serial.flush(id, function(result) {
//	    console.log("Flushing connection");
//	    console.log(result);
//	  
//	});

    }

    // end daq object definition.



    /**
     * onReceiveError()
     *
     * When a receive error occurs on the chrome.serial API, this
     * function is invoked to handle the error.
     *
     */
    function onReceiveError(info) {
	
	// Log to the console, for now.
	console.log(info);

	// Get the connectionId of the connection.
	var id = info.connectionId;

	// Get the error message; it's a string, e.g., "device_lost".
	var error = info.error;

	// Get the daq object to which this id is associated.
	var d = bt.devices.lookup(id);

	// If the device has been lost, but the object thinks it's
	// connected, close the connection.
	if(error === "device_lost" && d.connected === true) {
	    bt.ui.warning("Lost connection on " + d.path + ".");
	    d.close();
	}

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
	chrome.serial.onReceiveError.addListener(onReceiveError);
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
		// (Mac) or COM (Windows), then I am interested in
		// listing it for the user. If windows, list all COM
        // ports as we can't be sure which one is the Arduino
		if((path.indexOf("/tty.Adafruit") > -1)  ||
		   (path.indexOf("/tty.usbmodem") > -1)  || 
		   (path.indexOf("COM") > -1))               {

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
	    bt.ui.error("Received data from unregistered connection.  This can happen if you have two instances of the app running or you accidentally clicked the '+' button twice.");
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


	// ENABLE (or CONNECT): Add a device to the local registry and
	// establish a serial connection between the selected a device
	// and the box.
	//
	if(action === 'connect') {

	    // If the device hasn't been registered yet, connect.
	    if(d === null) {
	    	bt.ui.error("Currently connecting to device.  Please wait.");
	    }

	    else if(d === undefined) {
		bt.devices.connect(pathArray[0]);
	    }

	    // Is the device currently attempting to connect? Let's not connect
	    // a single device more than once.
	    else if(d.connecting) {
		bt.ui.error("Currently connecting to device.  Please wait.");
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

	// DISABLE: Disable a locally registered device from the
	// box. 
	else if(action === 'disable')
	    {

		// Are we busy connecting to a device?
		if (d === null) {
		    bt.ui.error("Attempting to connect to the device.  Please wait.");
		}
		// Determine if the device is already connected.  Let's
		// not disconnect a single device more than once.
		else if(d === undefined) {
		    bt.ui.error("The device is already disabled.");
		}
		// Are we busy re-connecting to a device?
		else if(d.connecting) {
		    bt.ui.error("Attempting to connect to the device.  Please wait.");
		}
		// Determine if the device is associated with an experiment.
		// If so, do not delete it.
		else if (d.experiment) {
		    bt.ui.error("The device is currently configured in an experiment.  It cannot be disabled at this time.");
		}		   
		else {
		    d.disable();
		}
	    }

	// REFRESH: As the locally registered and connected device for
	// 1 data report.
	else if(action === 'refresh') {

	    // It's not possible to refresh a device that is not enabled.
	    if (d === undefined || d === null || d.connected === false) {
		    bt.ui.error("The device is not enabled.");
		}
	    // It's not possible to refresh a device that is running a pc-style
	    // experiment where data is logged only to the desktop machine.
	    else if (d.running === true && 
		     bt.runnable.configuration.logging === 'pc' && 
		     bt.runnable.configuration.running === true) {
		
		bt.ui.error("The device is currently running an experiment.  Please wait.");
	    }	
	    // In all other cases, it is possible to refresh:
	    else {
		console.log("About to call refresh.", d);
		d.refresh();
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

	// Lookup the device.
	var d = bt.devices.lookup(path);

	// Are we currently attempting to connect to this path?  Check
	// the registry before proceeding.  If the device is undefined
	// this is the first attempt to connect to it.
	if (d === undefined) {}

	// Otherwise, if the device is null or the .connecting field is
	// set, then the application is trying to connect.
	else if (d === null || d.connecting === true) {
	    bt.ui.error("Currently connecting to " + path + ". Please wait.");
	    return;
	}

	// Otherwise, we may be attempting to connect a device that is
	// already connected.  If so, silently bail.
	else if(d.connected === true) { return; }

	// Register the path we are about to connect.  It may be that
	// we are trying to connect to a device for the first time.
	// If so, set its object to null.  Otherwise, it may be that
	// we are trying to re-connect to a previously connected
	// device.  If so, set its .connecting field to true.
	if (d === undefined) {
	    locals[path] = null;
	}
	else {

	    // If we are trying to re-connect to a previously connected
	    // device, indicate that we are trying to connect to it.
	    d.connecting = true;
	}

	// Provide some information to the user.
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
		
		// If the object wasn't defined before, set it back to be
		// undefined.
		if( locals[path] === null) {
		    locals[path] = undefined;
		}
		// If the object was defined before, set its .connecting
		// field to false.
		else {
		    locals[path].connecting = false;
		}
		
		bt.ui.error(path + " is not available for connection.  Perhaps it must be turned on?");
	    }
	    
	    else {

		// It may be that we are trying to connect a device
		// that hasn't been locally registered.
		var d = locals[path];

		// If the device hasn't been locally registered yet,
		// create an associated object for it and register it.
		if(d === null) {

		    // Create a software representation of the data acquisition unit
		    //that has just been connected to over the serial line.
		    d = bt.devices.register(path, false);
		}

		// Otherwise, indicate that it is no longer attempting
		// to connect.
		else {
		    d.connecting = false;
		}

		// Set the registered device's connectivity
		// information.		
		d.set(ci);

		// Send an initial message to the device.
		var p = d.protocol.acknowledge(0);

		// Handle the asynchronous result. 
		p.then(function(response) {

		    if (response.result === "Success") {
               // Indicate that the recently connected pathname is connected.
               bt.ui.indicate(path,'connected');
               bt.ui.info(path + ' is enabled.');
               bt.ui.displayRegistered();
		    }
		    else {
               bt.ui.error(path + ' cannot be enabled.');
		    }

		}, function(error) {
		    d.onRejection(error);
		});
	

	    }
	});

    } // end bt.devices.connect

    /**
     * getRegistry
     *
     * Based on the contents of the locals object, return 
     * an array of all paths for registered devices.
     *
     */
    bt.devices.getRegistry = function() {
	
	retVal = [];
	
	var i = 0;
	
	for(var path in locals) {
	    
	    if(locals[path] != undefined) {
		retVal[i] = path;
	    }
	    i++
	} 

	return retVal;

    }

    /**
     * getState
     * 
     * Based on the contents of the locals object, log to
     * console the current state of all devices registered
     * to the app.
     *
     */
    bt.devices.getState = function() {

	for(var path in locals) {

	    if(locals[path] != undefined) {
		console.log(path);
		console.log(bt.devices.lookup(path));
	    }
	}
    }
    

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

	return d;
    }

} // end bt.devices module

// Invoke module.
bt.devices();
