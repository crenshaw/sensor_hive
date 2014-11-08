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
    var commandElement = 0;

    var ct = "!;"  // The command terminator

    // Identify the position of these common tokens in responses.
    var ID = 0;
    var ADDRESS = 1;
    var PERIOD = 2;
    var TIME = 2;
    var VALUES = 3;
    var N = 3;

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

	// The last time each port on this device got a response.  For
	// now, I shall assume that the maximum number of ports on a
	// DAQ is 6 (where counting begins at 1).  At the start, a DAQ
	// has 6 ports that have never reported to the application.
	// Use -1 to indicate "never".
	this.lasttime = [-1, -1, -1, -1, -1, -1, -1];

	// The number of times the device has responded to the last
	// command.  For many commands, the device only responds once.
	// In others, there may be many responses to one command.
	this.count = 0;

	// Each protocol object keeps track of the commands to be
	// issued to the underlying device in the commandQueue.
	this.commandQueue = new Array();
    }

    /* 
     * To utilize a communication protocol for the devices in the SCIO
     * system, the following methods must be implemented.
     *
     * configurePeriod(n) 
     * acknowledge(a) 
     * getMeasurements(n).  
     * startMeasurements()
     * getLoggedData()
     * stop()
     *
     */

    bt.protocol.miniSDI12.prototype.acknowledge = acknowledge;
    bt.protocol.miniSDI12.prototype.configurePeriod = configurePeriod;
    bt.protocol.miniSDI12.prototype.getMeasurements = getMeasurements;
    bt.protocol.miniSDI12.prototype.startMeasurements = startMeasurements;    
    bt.protocol.miniSDI12.prototype.getLoggedData = getLoggedData;
    bt.protocol.miniSDI12.prototype.stop = stop;

    bt.protocol.miniSDI12.prototype.send = send;
    bt.protocol.miniSDI12.prototype.parse = parse;


    /**
     * acknowledge()
     *
     * This method issues an `A` command to the underlying miniSDI-12
     * device to ask for an acknowledgement of a given address, 'a',
     * on the device.  On miniSDI-12 devices, 0 is the DAQ and numbers
     * 1..n represent various ports.
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
     * This method issues a `P` command to the underlying miniSDI-12
     * device to configure its period to 'n', where 'n' is expressed
     * in seconds.
     *
     * @param n The new period, expressed in number of seconds. 
     *
     * @returns A promise that will eventually be fulfilled by a
     * response object representing the device's response.
     */
    function configurePeriod(n) {


	// An experiment's period is stored in a signed 16-bit
	// variable on the Arduino UNO.  Thus, the maximum possible
	// period on the DAQ is currently 2^15 - 1. This maximum is
	// enforced both by runnable.js and protocol.js.
	var maximumPossiblePeriod = 32767;

	if (typeof(n) === 'number' && n >= 1 && n <= maximumPossiblePeriod) {
	    var command = "0P" + n + ct;
	    return this.send(command, 0, "P", n);
	}
	
	else {
	    return new Promise(function(resolve, reject) {
		var ro = new bt.protocol.response();
		ro.type = "NA";
		ro.result = "Badly Formed Command";
		reject(ro);	
	    });
	}
    }

    /**
     * startMeasurements()
     *
     * This method issues an `M` command to the underlying miniSDI-12
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
     * This method issues an `R` command to the underlying miniSDI-12 device
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
     * getLoggedData()
     * 
     * This method issues a `D` command to the underlying miniSDI-12 device
     * to get all data currently backed up to the device itself.
     *
     */
    function getLoggedData() {
	
	var command = "0D0" + ct;
	return this.send(command, 0, "D");	
    }


    /**
     * stop()
     * 
     * This method issues a break command to the underlying miniSDI-12
     * device to get the device to stop its current M-style
     * experiment.
     */
    function stop() {

	var command = "    " + ct;
	return this.send(command, 0, "B");
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
	 * 8) result: success, error, abort.  The response object's
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
		    ro.terminated = true;

		    // If this last command issued was a break command,
		    // then this is the appropriate, and successful
		    // response to a break command.
		    if(ro.last.type === 'B') {
			ro.result = "Success";
		    }
		    // Otherwise, something bad has happened.
		    else {
			console.log("Abort response!");
			ro.result = "Abort";
		    }
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
		ro.time = parseInt(tokens[TIME]);

		// The M command responds with the number of seconds
		// until the experiment is done, while the R and D
		// commands respond with the number of seconds since
		// 1970.  So, if the time is not relatively large, and
		// the last command type sent was M, then this is
		// likely an M response.
		if ( ro.time < 1406666364 && this.last.type === "M") {

		    ro.type = 'M';
		    ro.n = parseInt(tokens[N]);

		    // Does the n-value match the transmitted n-value?
		    if (ro.n === this.last.n) {
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
     * The optional parameters of send() help to articulate the nature
     * of the command.
     *
     * For example to send `0D0!;` requires:
     *
     * c = "0P5"
     * a = 0
     * type = "P'
     * n = 5
     *
     * @param c The command to send.
     *
     * @param a The address used in the command.
     *
     * @param type The type of command being sent.
     *
     * @param n The n-value used in the command (optional).
     *
     * @returns A promise that will be resolved when the response to
     * the command is received.  The promise is rejected when the
     * response times out.

     */
    function send(c, a, type, n){

	console.log("Send()", c, a, type, n, this.path);
	

	// I can only send to the underlying device if:
	//
	// 1) The device is connected. A device is connected if its
	// corresponding protocol object (this) has connection
	// information that is a well-defined object.
	//
	// AND
	//
	// 2) The last command that was transmitted got a response.
	//
	// If the underlying device is not connected, that's 
	// bad.  Return a rejected promise.
	if (this.ci === undefined) {
	    
	    return new Promise(function(resolve, reject) {
		var ro = new bt.protocol.response();
		ro.type = "NA";
		ro.result = "Not Connected";
		reject(ro);	
	    });
	    
	}

	// OTHERWISE: I'm connected.  Now, affirm that the last command
	// that was transmitted got a response.  
	else {

	    var cmd = new command(c,a,type,n);
	    this.commandQueue.unshift(cmd);

	    // Get a command from the tail of the command queue.
	    var next = this.commandQueue.pop();	    

	    // Did we pop what was just pushed?
	    if(cmd.element === next.element) {
		return sendHelper.call(this, next);
	    }
	    else {
		return new Promise(function(resolve, reject) {
		    console.log("protocol.js:  Command queue was overrun!");
		    var ro = new bt.protocol.response();
		    ro.type = "NA";
		    ro.result = "Overrun";
		    reject(ro);	
		});
		
	    }
	}
    }

    /** 
     * sendHelper()
     *
     * This method, not public in the protocol object, transmits a
     * command to an underlying device.
     */
    function sendHelper(cmd) {

	//console.log(this);

	this.last.command = cmd.c;
	this.last.address = cmd.a;
	this.last.type = cmd.type;
	this.last.n = cmd.n;
	
	// Keep track of the last period value issued to the device 
	if(this.last.type === "P") {
	    this.last.period = cmd.n;
	}
	
	// Log the raw serial command to the debug serial console.
	bt.ui.serial(cmd.c);

	// Create a message and place it in an ArrayBuffer.
	var data = str2ab(cmd.c);	

	// Declare some variables for the closure below.
	var id = this.ci.connectionId;	
	var last = this.last;
	var sendInterval;
	var d = this;
	
	// Every invocation of send() returns a new Promise.
	return new Promise(function(resolve, reject) {

	    // I send a command and I expect a response in a certain
	    // amount of time.  If I don't get a response, then I need
	    // to reject this promise.
	    var duration = 4000;

	    // How long before I expect a response.  For R-style commands
	    // this is a long time, but otherwise, it's pretty quick.
	    if (last.type === "R") {
		
		// This might be a refresh command, 0R1:
		if (last.n == 1) {
		    duration = 1000;
		}
		// Otherwise, it's a longer experiment:
		else {

		    //There is some issue with the timer that the experiment
		    //runs for 14/15 of the time the user sets it up to, so
		    //multiplying the duration by 15/14 is a way to get around
		    //this issue.
		    duration = last.period * last.n * 1000 * (15/14);
		}
	    }

	    // Set a timer to reject the promise in `duration`
	    // milliseconds.
	    sendInterval = setTimeout(function(){
		var ro = new bt.protocol.response();
		ro.type = "NA";
		ro.result = "No Response";
		reject(ro);	
	    }, duration);

	    
	    chrome.serial.send(id, data, function(sendInfo) { });
	    
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

		    // The remainder is the new unfinished response
		    this.response = this.response.substring(nl + 1);

		    // Parse the complete, raw response and create a
		    // response object.
		    var ro = this.parse(finished)
		    
		    // Log the raw serial response to the debug serial console.
		    bt.ui.serial(ro.raw);

		    // Set the timestamp for "the last time we heard a
		    // data report from the particular address on the
		    // device."  Since the clock on the desktop is not
		    // synchronized with the clock on the device, I
		    // think it's best to use the timestamp provided
		    // by the device.
		    if(ro.type === "D" || ro.type === "R") {
		
			// If the time on the response is newer than the
			// lasttime we heard from this particular address,
			// then save this new time and log the data.
			if(ro.time > this.lasttime[ro.a]) {
			    this.lasttime[ro.a] = ro.time;

			    // Moreover, log this data here, so that only
			    // the freshest data is logged to the UI.  Some of
			    // the daq commands may resend the same data, so
			    // we need to avoid logging it multiple times.
			    
			    // Get rid of any colons to avoid user confusion.
			    var msg = ro.raw.replace(':','');

			    // Then log it.
			    bt.ui.log(msg);

			}
		    }

		    // We got a response from the command.  Resolve
		    // the promise with the response object.
		    if (ro.terminated == true) {
			clearTimeout(sendInterval);
			resolve(ro);
		    }
		}

	    } // end receive()

	    // Make this method public so that it may be called by
	    // the central receive function in devices.js that
	    // dispatches information received from each DAQ to the
	    // associated object.
	    bt.protocol.miniSDI12.prototype.receive = receive;

	}); // end return new Promise()
    }

    // *** COMMAND OBJECT DEFINITION ***

    /**
     * command()
     * 
     * This objects represents commands issued to the miniSDI-12
     * device.
     *
     * To initialize an instance of this object requires:
     *
     * @param c The string representing the raw command.
     *
     * @param a The address used in the command, likely 0.
     *
     * @param type The type of command:
     *
     *     B - Break Response
     *     A - Acknowledge Active
     *     P - Configure Period
     *     R - Continuous Measurement
     *     M - Start Measurement
     *     D - Get Data
     *
     * @param n The n-value used in the command.
     *
     */
    function command(c, a, type, n) {
	
	this.c = c;
	this.a = a;
	this.type = type;
	this.n = n;

	// Provide a number to this command.
	this.element = commandElement++;

	// Mark this command as having no response received.
	this.responseReceived = false;
    };


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
     * - ab2str() and str2ab() for packing and unpacking data
     * transmitted on the serial line.
     *
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
