/**
 * protocol.js
 * 
 * Defines the packaged app's functionality for constructing commands
 * and parsing responses for local serial devices utilizing the
 * miniSDI-12 protocol.
 */

// Extend the namespace
var bt = bt || {};
bt.protocol = {};

/**
 * protocol()
 * 
 * Define the protocol module.
 * 
 */
bt.protocol = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.data().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************
    var ct = "!;"  // The command terminator

    // Identify the position of these common tokens in responses.
    var ID = 0;
    var ADDRESS = 1;
    var PERIOD = 2;
    var TIME = 2;
    var VALUES = 3;

    // *** miniSDI12 OBJECT DEFINITION ***

    /**
     * miniSDI12()
     * 
     * This object represents the miniSDI-12 protocol.  This is the
     * constructor for the object.
     *
     * To initialize an instance of this object requires:
     *
     * @param path A full pathname representing the device to which
     * this protocol object is associated.    
     * 
     * @param ci The connection info for this device.
     *
     */

    bt.protocol.miniSDI12 = function(path, ci) {
	
	this.path = path; 
	this.ci = ci;

	// The default response for a newly created object is the
	// empty string, as it is assumed that the underlying device
	// hasn't replied to any commands yet.
	this.response = "";

	// The last command issued by this protocol.
	// It has a type and a command.
	this.last = {};
	this.last.command = "";
	this.last.type = "unknown";
	this.last.address = -1;

	// The last time this device got a response.
	this.lasttime = -1;

	// The number of times the device has responded to the last
	// command.  For many commands, the device only responds once.
	// In others, there may be many responses to one command.
	this.count = 0;
    }

    /* 
     * To utilize a communication protocol for the devices in the SCIO
     * system, the following methods must be implemented.
     *
     * configurePeriod(n)
     * acknowledge(a)
     * getMeasurements(n).  
     * start()
     * getData()
     *
     */

    bt.protocol.miniSDI12.prototype.acknowledge = acknowledge;
    bt.protocol.miniSDI12.prototype.configurePeriod = configurePeriod;
    bt.protocol.miniSDI12.prototype.getMeasurements = getMeasurements;
    bt.protocol.miniSDI12.prototype.startMeasurements = startMeasurements;    

    bt.protocol.miniSDI12.prototype.send = send;
    bt.protocol.miniSDI12.prototype.parse = parse;


    /**
     * acknowledge()
     *
     * This method issues a command to the underlying miniSDI-12 device
     * to ask for an acknowledgement of a given address, 'a', on the 
     * device.  On miniSDI-12 devices, 0 is the DAQ and numbers 1..n
     * represent various ports.
     *
     * @param a The address to send an acknowledgement.  The address
     * must be a number between 0 and 3 inclusive.
     *
     * @returns A promise that will eventually be fulfilled by a
     * response object representing the device's response.
     */ 
    function acknowledge(a) {

	if (typeof(a) === 'number' && a >= 0 && a <=3) {
	    var command = a + ct;
	    return this.send(command, a, "A");
	}
    }

    /**
     * configurePeriod()
     *
     * This method issues a command to the underlying miniSDI-12
     * device to configure its period to 'n', where 'n' is expressed
     * in seconds.
     *
     * @param n The new period, expressed in number of seconds. 
     *
     * @returns A promise that will eventually be fulfilled by a
     * response object representing the device's response.
     */
    function configurePeriod(n) {

	if (typeof(n) === 'number' && n >= 1 && n <=30) {
	    var command = "0P" + n + ct;
	    return this.send(command, 0, "P", n);
	}
	
	else {
	    return new Promise(function(resolve, reject) {
		var ro = new bt.protocol.response();
		ro.type = "NA";
		ro.result = "Fail";
		reject(ro);	
	    });
	}
    }

    /**
     * startMeasurements()
     *
     * This method issues a command to the underlying miniSDI-12
     * device to start taking measurements.
     *
     */
    function startMeasurements(n) {
	
	var command = "0M" + n + ct;
	return this.send(command, 0, "M", n);
	
    }

    /** 
     * getMeasurements()
     * 
     * This method issues a command to the underlying miniSDI-12 device
     * to get 'n' measurements.  The measurements are reported without
     * explicitly asking for them, i.e. "continuous mode."
     *
     * @param n The number of measurements to get.
     *
     */
    function getMeasurements(n) {
	
	if( typeof(n) === 'number' ) {
	    var command = "0R" + n + ct;
	    return this.send(command, 0, "R", n);
	}
    }

    /**
     * parse(s)
     *
     * Given a string response from a miniSDI-12 device, this method
     * parses the response sent by the daq and creates a response
     * object that can be queried for success, failure, measurements
     * or other results.
     *
     */
    function parse(s) {
    
	// Split the string on the commas and see how many
	// tokens we have.
	var tokens = s.split(',');
	
	/*
	 * 0) type
	 *
	 *     B - Abort or Break Response
	 *     A - Acknowledge Active
	 *     P - Configure Period
	 *     R - Continuous Measurement
	 *     M - Start Measurement
	 *     D - Get Data
	 *     NA - No response applicable.  This is for when
	 *          no command needs to be sent to the DAQ, but a successful
	 *          response object needs to be returned.
	 *
	 * 1) iii: A three-digit unique DAQ identifier. 
	 *
	 * 2) a: An integer value [0..9] representing a DAQ or a sensor address.
	 *
	 * 3) time: An integer value expressing the number of seconds since
	 *          Jan 1, 1970 that this response was received.
	 *
	 * 4) n: Either a period or a number of measurements, as provided
	 *       in the P and M responses.
	 *
	 * 5) values: An array of measurements in the data response.
	 *
	 * 6) period: The period at which the daq is configured.
	 *
	 * 7) terminated: It is true if only one response was expected
	 *    or if the terminating ':' has been received, false,
	 *    otherwise.
	 *
	 * 8) completed: It is true if an experiment is complete.  That
	 *    is, if an R or D response was received with a ':'.
	 *
	 * 9) result: success, error, abort.  The response object's
	 *    result field is set to 1 if the command last sent is
	 *    consistent with the most recent response received and
	 *    the response is a positive one. For example:
	 *  
	 *    0P30!;002,0,30<CR><LF>
	 * 
	 *    Is a consistent command-response and the response
	 *    demonstrates that the period was configured.  This
	 *    is 'success'.
	 *
	 *    Similarly,
	 *
	 *    0P30!;002,0,2<CR><LF>
	 *
	 *    Is consistent, but the response demonstrates that the
	 *    period was not configured.  This is 'Error'.
	 *
	 *    Next,
	 *
	 *    0P30!;002,0<CR><LF>
	 *
	 *    This command was met with an abort response.  So, 'abort'.
	 *
	 */

	// Make a new response object to return.
	var ro = new response();

	// Get the original response.
	ro.raw = s; 
	ro.completed = false;

	// Only responses with at least two tokens are valid.
	if (tokens.length >= 2) {

	    // Get the ID and address from the response.  This is
	    // the same for every response.
	    ro.id = tokens[ID];
	    ro.a = parseInt(tokens[ADDRESS]);

	    // If there are only two tokens, then this is either
	    // 1) An Abort reponse.
	    // 2) An Acknowledge Active response.
	    // 3) A Break response
	    if (tokens.length == 2) {
		
		// If the address matches the address on the last
		// command, then this is a response to an 
		// Acknowledge Active command.
		if(ro.a === this.last.address) {
		    ro.type = 'A';
		    ro.result = "Success";
		    ro.terminated = true;
		}

		// If the address is 0, then this is an
		// Abort response or a Break response.  These
		// are undistinguishable, but mean fairly
		// the same thing.  Just use one type, for now.
		else if (ro.a === 0) {
		    ro.type = 'B';
		    ro.result = "Abort";
		    ro.terminated = true;
		}
		    
	    }

	    // If there are 3 tokens, it is a configure period response.
	    // Extract the period from the response and set the type.
	    else if (tokens.length === 3) {

		ro.type = 'P';
		ro.period = parseInt(tokens[PERIOD]);

		// Is this response consistent with the last command?
		if(ro.type === this.last.type) {
		    
		    // Do the periods match?
		    if( ro.period === this.last.n ) {
			ro.result = "Success";
			ro.terminated = true;
		    }
		    
		    // If not, then the command was not successful and
		    // the result should be marked as 'Error'.
		    else {
			ro.result = "Error";
			ro.terminated = true;
		    }
		}
		
		// If not, then this response is unexpected, since it's
		// completely inconsistent with the last command. 
		//
		// TODO: Is 'unexpected' a result?
		else {
		    ro.result = "Unexpected";
		    ro.terminated = true;
		}
	    }
	    
	    // If there are 4 tokens, then this could be a response to
	    // a Continuous Measurement (R), Start Measurement (M) or
	    // Send Data (D) command.
	    else if (tokens.length === 4) {
		
		// Determine whether this is a response to an M command.
		// Get the time.  If it's 
		ro.time = tokens[TIME];

		// The M command responds with the number of seconds
		// until the experiment is done, while the R and D
		// commands respond with the number of seconds since
		// 1970.  So, if the time is not relatively large, and
		// the last command type sent was M, then this is
		// likely an M response.
		if ( ro.time < 1406666364 && this.last.type === "M") {

		    ro.type = 'M';
		    ro.n = tokens[N];

		    // Does the n-value match the transmitted n-value?
		    if (ro.n == this.last.n) {
			ro.result = "Success";
			ro.terminated = true;
		    }
		    else {
			ro.result = "Error";
			ro.terminated = true;
		    }
		}
		
		// This point is reached because an M-response has
		// been ruled out.  With four tokens, either it's an
		// R-response or a D-response.  It's not possible to
		// tell from the response which is which, so use the
		// last.type as the indication.
		else {
		
		    ro.result = "Success";
		    ro.type = this.last.type;
		    ro.time = tokens[TIME];
		    ro.values = tokens[VALUES];

		    // Is there a colon at the end of this?
		    if(s.indexOf(':') > -1) {
			ro.terminated = true;
			ro.completed = false;
		    }
		    else {
			ro.terminated = false;
		    }
		}
	    }
	}

	return ro;
    }

    /**
     * send()
     *
     * This method sends the physical device the supplied command.
     *
     * @param c The command to send.
     *
     * @param type The type of command being sent.
     */
    function send(c, a, type, n){

	this.last.command = c;
	this.last.address = a;
	this.last.type = type;
	this.last.n = n;
	
	// Create a message and place it in an ArrayBuffer.
	var data = str2ab(c);
	
	console.log("Sending on connection: ", this);
	var id = this.ci.connectionId;
	
	// Every invocation of send() returns a new Promise.
	return new Promise(function(resolve, reject) {

	    // TODO: Put reject up here and set it for a reasonable
	    // amount of time in which to expect a response.  If
	    // there's timeout?.... I think that works, but I need to
	    // read some more.
    
	    chrome.serial.send(id, data, function(sendInfo) {
		console.log(sendInfo);
	    });
	    
	    /**
	     * receive()
	     *
	     * receive data as it is received by Chrome over the serial line
	     * from a particular DAQ. As data is received asynchronously, we
	     * must handle the case that only parts of a single data report
	     * may be received by a single call to this function.  Thus,
	     * receive() keeps track of unparsed data received from a
	     * particular DAQ until it sees a <CR><LF>.
	     *
	     */
	    receive = function(info) {

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
		    
		    this.count++;

		    console.log(this);

		    // The remainder is the new unfinished response
		    this.response = this.response.substring(nl + 1);

		    // Parse the complete, raw response and create a
		    // response object.
		    var ro = this.parse(finished)
	    	    
		    // Set the timestamp for "the last time we heard
		    // from the device."  
		    this.lasttime = timestamp();

		    // We got a response from the command.  Resolve
		    // the promise with the response object.
		    if (ro.terminated == true) {
			resolve(ro);
		    }

		    // OR...It may be that we are expecting more than
		    // 1 response from a command.  Log the
		    // unterminated response from here.
		    else {
			bt.ui.log(ro.raw);
		    }
		}

		// TODO: I need a proper error condition for handling
		// the case where the promise is not fulfilled.  Right
		// now, let's pretend a really long response is a
		// reject case.
		else if (this.response.length > 100) {
		    reject(Error("reponse error")); 
		}

	    } // end receive()

	    // Make this method public so that it may be called by
	    // the central receive function in devices.js that
	    // dispatches information received from each DAQ to the
	    // associated object.
	    bt.protocol.miniSDI12.prototype.receive = receive;

	}); // end return new Promise()
    }



    // *** RESPONSE OBJECT DEFINITION ***

    /**
     * response()
     * 
     * This object represents a parsed, protocol-agnostic response
     * from a device.  This is the constructor for the object.
     *
     * A well-formed data response object has some of these key-value
     * pairs, depending on its type.  See the description in parse()
     * or, for a complete description, see the miniSDI-12 protocol
     * documentation.
     *
     * When a Response object is created, its type is simply "unknown".
     */

    bt.protocol.response = response;

    function response() {
	this.type = "unknown";
    }    

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt.miniSDI12 namespace.
    // ************************************************************************

    /* ************************************************************** 
     * 
     * Local Utility Functions, 
     *
     * - timestamp().
     *
     * - ab2str() and str2ab() for packing and unpacking data
     * transmitted on the serial line.
     *
     */

    /**
     * timestamp()
     *
     * Create a timestamp.
     *
     * @returns The number of seconds since Jan 1, 1970.
     */
    function timestamp() {

	var d = new Date();
	var n = d.getTime() + "";	
	return n;
    }


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
    }

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
    }
    


} // end bt.protocol module


// Invoke module.
bt.protocol();
