/**
 * runnable.js
 * 
 * Defines the packaged app's functionality for running and maintaining a
 * long-term experiment
 */

// Extend the namespace
var bt = bt || {};
bt.runnable = {};

/**
 * experiment()
 * 
 * Define the experiment module.
 * 
 */
bt.runnable = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.data().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************
    var NO_DATA = 1;
    var NO_RESPONSE = 2;

    // Devices in an experiment have one of two statuses: BROKEN or
    // READY.  Devices that are BROKEN need help getting their
    // connection re-established in an M-style experiment.  Devices
    // that are READY have had a connection re-established by the
    // experiment.
    var BROKEN = 1;
    var READY = 0;

    var MIN_DAQ_INTERVAL = 12;
    

    // This application has a single experiment configuration at a given time.
    // The experiment configuration is either 'undefined' or an experiment
    // object whose status is .running = true or .running = false.  At the 
    // start of execution, the experiment configuration is undefined.
    bt.runnable.configuration = undefined;

    // *** experiment OBJECT DEFINITION ***

    /**
     * experiment
     * 
     * This object represents the experiment.  This is the
     * constructor for the object.
     *
     * To initialize an instance of this object requires:
     *
     * @param input An array of input values, as prepared by convertInput().
     * 
     */
    bt.runnable.experiment = function(input) {
	
	this.logging = input.logging;   // Logging on desktop or desktop + daq.
	this.devices = input.devices;   // The list of device paths.

	// It is tempting to keep track of daq objects, to avoid
	// lookup, but there's a problem.  Daqs change state over time
	// -- they are reconnected on different serial connection IDs,
	// for example, and keeping track of daq objects can mean that
	// the experiment's copy of the daq object goes stale.
	// Instead, whenever I want to contact a daq, just lookup its
	// object using its pathname, stored in this.devices, defined
	// above.

	this.p = input.p;               // Period, in seconds.
	this.period = input.period;     // Period, as originally provided.
	this.p_units = input.p_units;   // Units of period, as originally provided.

	this.d = input.d;               // Duration, in seconds.
	this.duration = input.duration; // Duration, as originally provided.
	this.d_units = input.d_units;   // Units of duration, as originally provided.
	
	this.running = false;           // Upon creation, an experiment is
	                                // not running.

	// The connectivity manager is in charge of attempting to
	// reconnect with experiment devices that have no connection.
	this.cm = {};
	this.cmInterval = -1;
    };
    
    // Update the prototype for all devices of type experiment who
    // share the same methods.
    bt.runnable.experiment.prototype.start = start;
    bt.runnable.experiment.prototype.clear = clear;
    bt.runnable.experiment.prototype.stop = stop;
    bt.runnable.experiment.prototype.onNoResponse = onNoResponse;

    bt.runnable.experiment.prototype.isNewlyBroken = isNewlyBroken;
    bt.runnable.experiment.prototype.setBroken = setBroken;
    bt.runnable.experiment.prototype.clearBroken = clearBroken;

 
    /**
     * start()
     *
     * Start the given experiment.
     *
     */
    function start() {
	
	// Is an experiment already running on the application?
	if(this.running === true) {
	    bt.ui.error("The experiment is already running.  Please wait.");
	}
	else {
	    // Call go() for each device belonging to this
	    // experiment.
	    var d = bt.devices.lookup(this.devices[0]);

	    // If the devices are connected, then start an experiment.
	    if(d.connected) {

		bt.ui.info("Starting the experiment...");
        
		this.running = true;

		d.go(this.logging);

		// Now that we've hit the 'go' button on all the devices,
		// we must responsibly manage the experiment. Begin calling
		// the experiment manager, manage() on regular intervals.
		
		// For pc-style logging, the interval for the manager can
		// be roughly the same period as the experiment's period.
		// Be sure to use the value of period, as it is expressed
		// in seconds.
		var ep = this.p + 2;
		console.log("Setting experiment polling period to: ", ep);
		
		// For daq-style logging, the interval has a minimum.
		if(this.logging === "daq") {
		    if (ep <= MIN_DAQ_INTERVAL) {
			ep = MIN_DAQ_INTERVAL;
		    }
		}

		// Set up the interval
		this.interval = setInterval(function(){ manage.call(); }, (ep) * 1000);
	    }
	    else {
		bt.ui.error("Cannot start the experiment.  " + d.path + " is disconnected.  Please enable it.");
	    }
	    
	}	
    }

    /**
     * stop()
     *
     * Stop the given experiment.  
     *
     * Note: I'm agonizing over whether to call this "stop" or
     * "cancel" as experiments cannot be resumed.
     *
     */
    function stop(){

	// If an experiment isn't already running, there is no 
	// work to do.
	if(this.running) {

	    // Examine the list of devices and stop each one.
	    for(var i = 0; i < this.devices.length; i++) {
		
		var d = bt.devices.lookup(this.devices[i]);

		if(d != undefined && d.connected && d.running ) {
		   
		    d.stop();
		}
	    }
	}
	
	// Just told a bunch of devices to stop.  Now we need
	// to wait and see if they did.  The manage() method will
	// automatically take care of this.
    }


    /** 
     * clear()
     *
     * For each device registered with this experiment, clear the
     * device; that is indicate on the daq object that it is no longer
     * associated with this experiment.
     *
     */
    function clear() {

	// Is an experiment already running on the application?
	if(this.running === true) {
	    bt.ui.error("The experiment is already running.  Please wait.");
	}
	else {

	    // Examine the list of devices and clear each one.
	    for(var i = 0; i < this.devices.length; i++) {
		
		var d = bt.devices.lookup(this.devices[i]);
		d.experiment = false;
		bt.ui.indicate(this.devices[i], 'clear');
		
	    }
	}
    }

    /**
     * onNoResponse()
     *
     * For an experiment with daq-style logging, this function defines
     * what an experiment should do if a device does not respond
     * properly to queries for data (D-commands).
     *
     * @param err The error number that caused invocation of this
     * method.
     *
     * @param path The pathname representing the troubled device.
     *
     * @param response If available, the last response received from
     * the device.  For example, a device may have simply replied
     * with an Abort response, which is less devastating than no
     * response at all.
     *
     */
    function onNoResponse(err, path, response) {

	// If there's no response from the device, attempt to
	// re-establish a connection to it.
	console.log(this);
	
	// If we are getting no response and if this device is 
	// only recently observed as broken, attempt to reestablish
	// the connection.
	if(err === NO_RESPONSE && this.isNewlyBroken(path)) {

	    // Capture this for the upcoming closure.
	    var ex = this;
	    
	    // Set this device as broken, from the experiment's
	    // perspective.
	    ex.setBroken(path);

	    // I am going to attempt to reconnect to this
	    // BROKEN device every 12 seconds.  
	    var duration = 12000;

	    // Kick off the connectivity task.  I am going to do the
	    // following with a period of `duration`.  That is, every
	    // `duration` ms, I'm going to try to reconnect, or
	    // observe that I have established a reconnection.
	    ex.cmInterval = setInterval(function() {

		// 1. Lookup the device.
		var d = bt.devices.lookup(path);

		// 2. If it's not connected, attempt to 
		// connect it.
		if(d === undefined || d.connected === false) {
		    bt.ui.warning("Attempting to re-establish connection to " + path + ".");
		    bt.devices.connect(path);
		    return;
		}
		
		// 3. Otherwise, if it's connected, stop trying
		// to connect to it.
		else if(d.connected) {
		    ex.clearBroken(path);
		    bt.ui.info("Re-established connection to " + path + ".");
		    clearTimeout(ex.cmInterval);
		    return;
		}

	    }, duration); 
	}
	

    }

    /**
     * isNewlyBroken(path)
     *
     * Determine if a given device, represented by its path, has only 
     * been recently observed as BROKEN by this experiment.
     *
     * @param: path A pathname representing the device.
     * 
     * @returns: true is the device is BROKEN, false otherwise.
     */
    function isNewlyBroken(path) {

	// If the value of the .path is undefined, this is the first
	// time we are noticing that this device is broken.
	if (this.cm[path] === undefined) return true;

	if (this.cm[path] === BROKEN) return false;

	if (this.cm[path] == READY) return true;

	else return false;
    }

    /**
     * setBroken(path)
     *
     * Given a particular path, set it as BROKEN for this experiment.
     * 
     * @param: path A pathname representing the device.
     *
     */
    function setBroken(path) {

	this.cm[path] = BROKEN;

	return;
    }


    /**
     * clearBroken(path)
     *
     * Given a particular path, set it as READY for this experiment.
     * 
     * @param: path A pathname representing the device.
     *
     */    
    function clearBroken(path) {

	this.cm[path] = READY;

    }

    // end definition of experiment()


    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************

    /**
     * manage()
     *
     * Manage the currently executing experiment.  To "manage"
     * an experiment means to do the following babysitting:
     *
     * For each daq registered with the experiment:
     *
     * 1) Determine if the daq.running === false.  This means
     * that the daq itself thinks its experiment is over.
     *
     * 2) Query the daq to learn the last time the software daq
     * object received data from its physical counterpart.  If 
     * this is a very old stamp, it's possible we've lost touch
     * with the daq.  
     *
     */
    function manage() {

	var isDone = true;
	var isBroken = true;
	var config = bt.runnable.configuration;

	// First thing, first.  Check the health of the devices: their
	// `.connected` and `.running` status.

	for(var i = 0; i < config.devices.length; i++) {
	    var d = bt.devices.lookup(config.devices[i]);

	    // Are the devices done running?  If so, then the experiment
	    // is done.
	    if (d.running === true) {
		isDone = false;
	    }

	    // Are the devices connected?  If they are all disconnected,
	    // then something bad may have happened.
	    if (d.connected === true) {
		isBroken = false;
	    }
	}


	// If all the devices are not connected and the experiment is
	// a pc-style experiment, then quit the experiment.
	if(isBroken && config.logging === "pc") {

	    // Clear the experiment and devices.  Nobody is running
	    // anymore.
	    config.running = false;
	    config.clear();

	    // Stop re-invoking this manager.
	    clearInterval(config.interval);

	    // Inform the user.
	    bt.ui.warning('All the devices are disconnected; ending the experiment.');
        //TODO Finalize removing this. With new data table setup
        //the <hr> block seems unnecessary
	    //bt.ui.log();
	    return;
	}
	    

	// If all the devices are done running, then clear the manager's
	// periodic interval.
	else if(isDone) {
	    config.running = false; 
	    clearInterval(config.interval);

	    // If this is not a logging experiment, we're done.
	    if(config.logging === "pc") {

		bt.ui.info('The experiment is complete.');
        //TODO Finalize removing this. With new data table setup
        //the <hr> block seems unnecessary
		//bt.ui.log();
		return;
	    }

	    // If this is an experiement in which data is being logged to the
	    // daq, it is worthwhile to send one last request for data to 
	    // ensure that we got all of the measurements to this application.
	    else {

		// Call get() on the 0th daq, since we only handle 1 device
		// for an experiment right now.
		var d = bt.devices.lookup(config.devices[0]);
		var p = d.get();
	    
		// Handle the asynchronous result. 
		p.then(function(response) {

		    bt.ui.info('The experiment is complete.');
		    bt.ui.log();

		    if (response.result != "Success") {
			bt.ui.warning("Error 3: Could not get final data from device");
		    }
		    
		}, function(error) {

		    bt.ui.warning("Error 4: Could not get final data from device");
		    bt.ui.info('The experiment is complete.');
            
            //TODO Finalize removing this. With the new experiment window
            //setup this seems unnecessary
		    //bt.ui.log();
		});
	    }
	}

	// If this is an experiment in which data is being logged to
	// the daq, then we need to routinely issue a D command to get
	// the backed up data off the daq.
	else if(config.logging === 'daq') {
	    
	    // Call get() on the 0th daq, since we only handle 1 device
	    // for an experiment right now.
	    var d = bt.devices.lookup(config.devices[0]);
	    var p = d.get();
	    
	    // Handle the asynchronous result. 
	    p.then(function(response) {
		
		console.log(response);

		if (response.result != "Success") {

		    bt.ui.warning("Error 1: Application is not receiving data from device.");
		    config.onNoResponse(NO_DATA, config.devices[0], response);
		}
		
		
	    }, function(error) {
		config.onNoResponse(NO_RESPONSE, config.devices[0]);
	    });
	}	
    }


    /**
     * toSeconds()
     * 
     * Based on the units provided, convert the 'value' to seconds.
     *
     * @param value An integer value, 1 or greater.
     *
     * @param units A string, 'minutes', 'hours', or 'seconds'.
     */
    function toSeconds(value, units) {

	// Based on the units, calculate the value of the period and the
	// duration in seconds.  Be sure to assume the worst about
	// the incoming parameters.
	if (value === undefined) return undefined;
	else if(value === NaN) return undefined;
	else if(value === 0) return undefined;
	else if (units === 'seconds') return value;
	else if (units === 'minutes') return value * 60;	
	else if (units === 'hours') return value * 60 * 60;
	else return undefined;
    }


    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt.runnable namespace.
    // ************************************************************************

    /**
     * createExperiment()
     *
     * Given a collection of input, check the input to make sure it is
     * within acceptable range, and prepare to call the experiment()
     * constructor to register a new experiment with the application.
     *
     * This function logs any errors resulting from the input values and
     * it invokes the function 'action' when it is all done.
     *
     */
    bt.runnable.createExperiment = function(logging, devices, period, p_units, duration, d_units, action) {
    
	var per = toSeconds(period, p_units);
	var dur = toSeconds(duration, d_units);

	// An experiment's period is stored in a signed 16-bit
	// variable on the Arduino UNO.  Thus, the maximum possible
	// period on the DAQ is currently 2^15 - 1.  This maximum is
	// enforced both by runnable.js and protocol.js.
	var maximumPossiblePeriod = 32767;
	
	if(per === undefined) {
	    bt.ui.error("The period must be an integer value greater than 0");
	    return;
	}
	
	else if(dur === undefined) {
	    bt.ui.error("The duration must be an integer value greater than 0");
	    return;
	}

	else if(per > maximumPossiblePeriod) {
	    bt.ui.error("At this time, the period cannot exceed " + maximumPossiblePeriod + " seconds.");
	    return;
	}

	else if(dur < per) {
	    bt.ui.error("The duration must be greater than the period.");
	    return;
	}

	else if(devices === undefined) {
	    bt.ui.error("To configure an experiment, please select at least one device.");
	    return;

	}
	else {

	    // At this point, it is known that the values for period
	    // and duration are legal, and that there is at least one
	    // path in the list of devices.  Before creating an
	    // experiment, affirm that the app isn't already running
	    // an experiment, the devices are connected, and can be
	    // configured for the desired period.

	    // Is a experiment running?
	    if(bt.runnable.configuration != undefined && bt.runnable.configuration.running) {   

		// Don't setup an experiment while one is already running.
		bt.ui.error("Cannot configure a new experiment while the device is running an experiment.");
		return;
	    }
	    
	    // Are all the devices enabled?
	    for(var i = 0; i < devices.length; i++) {
		var d = bt.devices.lookup(devices[0]);

		if(d === undefined) {
	    	    bt.ui.error("Cannot configure a new experiment for " + devices[i] + ". It has not been enabled.");
		    return;
		}	    
	    }
	 
	 

	    // TODO: Figure out how to call setup on an array of devices and chain the
	    // promises together.


	    // Call setup on the device using the period and duration
	    // values expressed in units of seconds.
	    console.log("Setting up experiment for", per, dur);
	    var p = d.setup(per, dur);
	    
	    // Handle the asynchronous result. 
	    p.then(function(response) {

		if (response.result === "Success") {
			
		    var result = {};
		    
		    result.logging = logging;
		    result.devices = devices;
		    result.p = per;
		    result.period = period;
		    result.p_units = p_units;
		    result.d = dur;
		    result.duration = duration;
		    result.d_units = d_units;			
		    

		    // About to register a new experiment.  Clear the
		    // experiment field on the previous devices.
		    if (bt.runnable.configuration != undefined) {
			var prev = bt.devices.lookup(bt.runnable.configuration.devices[0]);
			prev.experiment = false;
		    }

		    // Create the experiment object and assign it as the application's
		    // experiment.
		    bt.runnable.configuration = new bt.runnable.experiment(result);
		    
		    // Register the experiment with the device.
		    var d = bt.devices.lookup(bt.runnable.configuration.devices[0]);
		    d.experiment = true;
		    console.log("Registering experiment with: ", d.path);

		    var msg = d.path + ' has a configured period of ' + period + ' ' + p_units + ' with an experiment length of ' + duration + ' ' + d_units + '.';
		    bt.ui.info(msg);

		    var loggingMsg;

		    // Decide on the logging setting message that
		    // will be displayed to the user.
		    if (logging === 'pc') loggingMsg = "desktop only";
		    else if (logging === 'daq') loggingMsg = "desktop and DAQ";

		    // Ask the UI module to log the experiment to
		    // the experiment window.
		    bt.ui.experiment(devices, period, p_units, duration, d_units,loggingMsg);
		    bt.ui.indicate(d.path, 'experiment');
		 
		    action.call();   
		}
		else {
		    bt.ui.error("Experiment configuration failed.");
		}
		
	    }, function(error) {
		bt.ui.error("Experiment configuration failed.");
		
	    });
	}
    };
   

} // end bt.runnable module


// Invoke module.
bt.runnable();
