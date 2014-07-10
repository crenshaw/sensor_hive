/**
 * miniSDI12.js
 * 
 * Defines the packaged app's functionality for constructing commands
 * and parsing responses for local serial devices utilizing the
 * miniSDI-12 protocol.
 */

// Extend the namespace
var bt = bt || {};
bt.miniSDI12 = {};

/**
 * miniSDI12()
 * 
 * Define the data module.
 * 
 */
bt.miniSDI12 = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.data().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************
    var ct = "!"  // The command terminator


    // *** RESPONSE OBJECT DEFINITION ***

    /**
     * response()
     * 
     * The response object represents the parsed response from a
     * local serial device according to the miniSDI-12 protocol.  This
     * is the constructor for the object.
     *
     * A well-formed data response object has these key-value pairs.
     *
     * 0) type: 'data' 
     * 1) preamble: '*'
     * 2) iii: A three-digit unique DAQ identifier. 
     * 3) a: An integer value [0..9] representing a DAQ or a sensor address.
     * 4) timestamp: An integer value expressing the number of seconds since
     *               Jan 1, 1970 that this response was received.
     * 5) measurement(s): An array of measurements in the data response.
     * 6) terminator: An indication, true or false, that the response 
     *                terminator has been received.
     * 
     * or:
     * 
     * 0) type: 'ack'
     * 1) preamble: '*'
     * 2) iii: A three-digit unique DAQ identifier. 
     * 3) a: An integer value [0..9] representing a DAQ or sensor address.
     * 4) terminator: An indication, true or false, that the response
     *                terminator has been received.
     *
     * When a Response object is created, its type is simply "unknown".
     * 
     */
    function response() {
	this.type = "unknown";
    }

    
    function parse(m) {

	
	// Create a new response object.
	var r = new Response();

	// HALF-BAKED parsing idea.

	// Is there any unfinished business?  If the length is 0, then
	// we need to find the preamble in the most-recently received
	// data.
	var ind = 0;
	
	if ((ind = data.indexOf('*')) != -1)
	    {

		// Set the preamble on the unfinished response.
		r.preamble = '*';

		bt.ui.log("Start of new business...");
		
		// Timestamp the start of new business.
		
		// What time is it?
		var d = new Date();
		var n = d.getTime();

		data = n + ",";

		// Set the timestamp on the unfinished response.
		r.timestamp = n;
	    }

    }

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt.miniSDI12 namespace.
    // ************************************************************************

    /**
     * timestamp()
     *
     * Timestamp a response.
     *
     * @param r The response to timestamp.  The response must have the
     * timestamp placeholder <time>.  If no placeholder exists, the
     * function will return the supplied response with no alteration.
     * 
     * @returns The supplied response, now with a timestamp.
     */
    bt.miniSDI12.timestamp = function(r) {

	var d = new Date();
	var n = d.getTime() + "";	
	return r.replace("<time>", n);
    };

    /**
     * makeCommand()
     * 
     * Given a type, a sensor address, and an optional value
     * qualifying the command construct and return the appropriate
     * string representing the command.
     *
     * @param type A string representing the type of command to make:
     * 
     * A: Acknowledge Active: a!;
     * P: Configure Period: 0Pn!;
     * R: Continuous Measurement: aRn!;
     *
     * @param a The sensor address.
     *
     * @param value An optional value qualifying the command.
     *
     * @returns A string representing the particular command.  If
     * there is an error in the combination of parameters, the
     * function returns undefined.
     */
    bt.miniSDI12.makeCommand = function(type, a, n) {
	
	if(type === 'A') {
	    return a + ct;
	}
	    
	else if (type === 'P') {
	    return "0P" + n + ct; 
	}

	else if (type === 'R') {
	    return a + "R" + n + ct;
	}
	
	else {
	    return undefined;
	}
	    
    }


} // end bt.miniSDI12 module


// Invoke module.
bt.miniSDI12();
