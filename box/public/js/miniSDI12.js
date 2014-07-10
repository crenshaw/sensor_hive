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

    // Identify the position of these common tokens in responses.
    var ID = 0;
    var ADDRESS = 1;
    var PERIOD = 2;
    var TIME = 2;
    var VALUES = 3;

    // *** RESPONSE OBJECT DEFINITION ***

    /**
     * response()
     * 
     * The response object represents the parsed response from a
     * local serial device according to the miniSDI-12 protocol.  This
     * is the constructor for the object.
     *
     * A well-formed data response object has some of these key-value
     * pairs, depending on its type.  For a full description, see the
     * miniSDI-12 protocol documentation.
     *
     * 0) type: A, P, or R (for now).
     * 1) iii: A three-digit unique DAQ identifier. 
     * 2) a: An integer value [0..9] representing a DAQ or a sensor address.
     * 3) time: An integer value expressing the number of seconds since
     *          Jan 1, 1970 that this response was received.
     * 4) values: An array of measurements in the data response.
     * 5) period: The period at which the daq is configured.
     *
     * When a Response object is created, its type is simply "unknown".
     * 
     */

    // Note that the constructor must be public since modules
    // outside this one use it.
    bt.miniSDI12.response = function() {
	this.type = "unknown";
    };


    // Update the prototype for all devices of type response who share
    // the same methods.
    bt.miniSDI12.response.prototype.isData = isData;
        

    /** 
     * isData()
     *
     * Is this a response to an R command?  In other words, does
     * it contain data?
     *
     */
    function isData() {
	return this.type === 'R';	
    };

    /**
     * clearFields()
     *
     * Clear all possible fields to this object.  Reset all fields
     * to 'undefined' except 'type' which is set to 'unknown'.
     */
    function clearFields() {
	
	this.type = "unknown";
	this.iii = undefined;
	this.a = undefined;
	this.time = undefined;
	this.values = undefined;
	this.period = undefined;
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
     * parse()
     *
     * Given a string response from a miniSDI-12 device, parse
     * the string and populate the given reponse object 
     *
     */
    bt.miniSDI12.parse = function(r, o) {
    
	// Split the string on the commas and see how many
	// tokens we have.
	var tokens = r.split(',');

	console.log(tokens);
	
	// If there are 3 tokens, it is a configure period response.
	if (tokens.length === 3) {
	    o.type = 'P';
	    o.period = tokens[PERIOD];
	    o.id = tokens[ID];
	}

	else if (tokens.length === 4) {
	    o.type = 'R';
	    o.time = tokens[TIME];
	    o.values = tokens[VALUES];
	}

	console.log(o);

	return;
    }


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
