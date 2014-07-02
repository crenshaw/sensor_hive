/**
 * response.js
 * 
 * Defines the packaged app's functionality for parsing responses from
 * local serial devices utilizing the miniDSI-12 protocol. 
 */

// Extend the namespace
var bt = bt || {};
bt.response = {};

/**
 * response()
 * 
 * Define the data module.
 * 
 */
bt.response = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.data().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************
    var unfinished = '';


    // *** RESPONSE OBJECT DEFINITION ***

    /**
     * Response()
     * 
     * The Response object represents the parsed response from a
     * local serial device according to the miniSDI-12 protocol.  This
     * is the constructor for the object.
     *
     * A well-formed data Response object has these key-value pairs.
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
    function Response() {
	this.type = "unknown";
    }

    Response.prototype.isComplete = isComplete;

    /**
     * isComplete
     *
     * Invoked on a response object, this function returns true if the
     * object contains a complete set of key-value pairs for the 
     * 
     */
    function isComplete() {
	
    }


    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************

    function ab2str(buf) {
	var bufView = new Uint8Array(buf);
	var encodedString = String.fromCharCode.apply(null, bufView);
	return decodeURIComponent(escape(encodedString));
    };

    /**
     * scan()
     *
     * Scan data as it is received by Chrome over the serial line.  As
     * data is received asynchronously, we must handle the case that
     * only parts of a single data report may be received by a single
     * call to this function.  Thus, scan() keeps track of unparsed
     * data received until it sees a <CR><LF>.
     *
     * IMPORTANT: It is assumed and it must be enforced that only one
     *   DAQ at a time may be permitted to send a response to the box.
     */
    bt.response.scan = function(info){

	console.log("Parsing data from id " + info.connectionId);

	var data = "";
		
	// Given an ArrayBuffer of data, construct a string and parse
	// the data.
	var dv = new DataView(info.data);

	console.log("Received " + info.data.byteLength + " bytes");
	
	// Make a string out of the data that was most recently received.
	// The data is cloistered in an ArrayBuffer, have ab2str() get
	// it out.
	var data = ab2str(info.data);
	console.log(data);

	unfinished += data;
	
	var ind;

	if((ind = data.indexOf('\n')) != -1) {
	   
	    // Chop unfinished at the '\n'.  
	    // Everything before that is a finished response
	    // that needs to be parsed.
	    var finished = unfinished.substring(0, ind + 1);

	    // The remainder is the new unfinished response
	    unfinished = unfinished.substring(ind + 1);

	    // For now, just log the raw stuff.
	    bt.ui.log(finished);
	    
	}
    };


    
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

} // end bt.response module


// Invoke module.
bt.response();
