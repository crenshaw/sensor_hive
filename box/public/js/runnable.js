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
	this.daqs = input.daqs;         // The list of the devices' daq objects.

	this.p = input.p;               // Period, in seconds.
	this.period = input.period;     // Period, as originally provided.
	this.p_units = input.p_units;   // Units of period, as originally provided.

	this.d = input.d;               // Duration, in seconds.
	this.duration = input.duration; // Duration, as originally provided.
	this.d_units = input.d_units;   // Units of duration, as originally provided.
	
	this.running = false;           // Upon creation, an experiment is
	                                // not running.
    };
    
    // Update the prototype for all devices of type experiment who
    // share the same methods.
    bt.runnable.experiment.prototype.start = start;

    
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
	    console.log(this);

	    this.running = true;
	    bt.ui.info("Starting the experiment...");

	    // Call go() for each device belonging to this
	    // experiment.
	    this.daqs[0].go(this.logging);	    

	    // Now that we've hit the 'go' button on all the devices,
	    // we must responsibly manage the experiment.
	    this.interval = setInterval(function(){ manage.call(); }, this.period * 1000);
	}	
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
	var config = bt.runnable.configuration;

	console.log("Monkey");
	console.log(config.daqs);

	// First thing, first.
	//
	// Are the daqs done running?  If so, then the experiment
	// is done.
	for(var i = 0; i < config.daqs.length; i++) {
	    console.log(config.daqs[i]);
	    if (config.daqs[i].running === true) {
		isDone = false;
	    }
	}

	// If all the daqs are done running, then clear the manager's
	// periodic interval.
	if(isDone) {
	    config.running = false;
	    clearInterval(config.interval);
	    bt.ui.info('The experiment is complete.');
	    return;
	}

	// Otherwise, if this is an experiment in which data is being
	// logged to the daq, then we need to routinely issue a D
	// command to get the backed up data off the daq.  
	if(config.logging === 'daq') {
	    
	    for(var i = 0; i < config.daqs.length; i++) {
		config.daqs[i].get();
	    }
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
    
	var p = toSeconds(period, p_units);
	var d = toSeconds(duration, d_units);
	
	console.log(logging);

	if(p === undefined) {
	    bt.ui.error("The period must be an integer value greater than 0");
	    return;
	}
	
	else if(d === undefined) {
	    bt.ui.error("The duration must be an integer value greater than 0");
	    return;
	}

	else if(p > 30) {
	    bt.ui.error("At this time, the period cannot exceed 30 seconds.");
	    return;
	}

	else if(d < p) {
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
	    
	    var daqs = new Array();

	    // Are all the devices enabled?
	    for(var i = 0; i < devices.length; i++) {
		var d = bt.devices.lookup(devices[0]);

		if(d === undefined) {
	    	    bt.ui.error("Cannot configure a new experiment for " + devices[i] + ". It has not been enabled.");
		    return;
		}	    
		 
		// If the device is enabled, keep track of it in array
		// of devices associated with the experiment that is
		// about to be created.
		else {
		    daqs[i] = d;
		}
	    }
	    
	    console.log("About to create experiment");
	    console.log(daqs[0]);

	    // Determine the success message.
	    var msg = d.path + ' has a configured period of ' + period + ' ' + p_units + ' with an experiment length of ' + duration + ' ' + d_units + '.';

	    // TODO: Figure out how to call setup on an array of devices and chain the
	    // promises together.
	    var p = d.setup(period, duration);
	    
	    // Handle the asynchronous result. 
	    p.then(function(response) {

		if (response.result === "Success") {
			
		    var result = {};

		    result.logging = logging;
		    result.daqs = daqs;
		    result.devices = devices;
		    result.p = p;
		    result.period = period;
		    result.p_units = p_units;
		    result.d = d;
		    result.duration = duration;
		    result.d_units = d_units;			
		    
		    // About to register a new experiment.  Clear the
		    // experiment field on the previous daqs.
		    if (bt.runnable.configuration != undefined) {
			bt.runnable.configuration.daqs[0].experiment = false;
		    }

		    // Create the experiment object and assign it as the application's
		    // experiment.
		    bt.runnable.configuration = new bt.runnable.experiment(result);
		    
		    console.log(bt.runnable.configuration);

		    // Register the experiment with the device.
		    d.experiment = true;

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
		
	    }, function(error) {
		bt.ui.error("Experiment configuration failed.");
		
	    });
	}
    };
   

} // end bt.runnable module


// Invoke module.
bt.runnable();
