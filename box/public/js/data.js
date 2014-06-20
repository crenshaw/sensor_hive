/**
 * data.js
 * 
 * Defines the packaged app's functionality for parsing data received
 * from devices.
 *
 */

// Extend the namespace
var bt = bt || {};
bt.data = {};

/**
 * data()
 * 
 * Define the data module.
 * 
 */
bt.data = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.data().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************
    var unfinished = "";

    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt namespace.
    // ************************************************************************

    /**
     * parse()
     *
     * Parse data as it is received by Chrome over the serial line.  As data
     * is received asynchronously, we must handle the case that only parts
     * of a single data report may be received by a single call to this
     * function.
     */
    bt.data.parse = function(info){

	var datum = "";

	// Is there any unfinished business?
	if (unfinished.length == 0)
	    {
		// If not, timestamp the start of new business.
		
		// What time is it?
		var d = new Date();
		var n = d.getTime();

		datum = n + ",";
	    }
		
	// Given an ArrayBuffer of data, parse the data and construct
	// a display'able string of data.
	var dv = new DataView(info.data);
	
	for(var i = 0; i < info.data.byteLength; i++) {
	    datum +=String.fromCharCode(dv.getInt8(i));
	}

	// Get the length of the most recently sent data and the
	// curren unfinished business.
	totalLength = datum.length + unfinished.length;

	console.log("Total length of current data: " + totalLength);

	if( totalLength < 19) {
	    unfinished += datum;
	    console.log(datum);
	}
	else {
	    console.log("Completed a data unit");
	    bt.ui.log(unfinished + datum);
	    unfinished = "";
	}
	
    };

} // end bt.data module


// Invoke module.
bt.data();
