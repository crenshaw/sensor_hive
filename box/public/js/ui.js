/**
 * devices.js
 * 
 * Defines the packaged app's functionality for finding, connecting
 * to, and communicating with the supported devices.
 *
 */

// Extend the namespace
var bt = bt || {};
bt.ui = {};

/**
 * ui()
 * 
 * Define the user interface module.
 * 
 */
bt.ui = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.ui().

    // ************************************************************************
    // Variables local to this module.
    // ************************************************************************


    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************


    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt namespace.
    // ************************************************************************

    /**
     * displayLocals()
     *
     * Given an array, display the elements of that array in 
     * the container local_devices_list.
     */
    bt.ui.displayLocals = function(array) {

	// Grab the local device list container
	var list = document.getElementById('local_devices_list');

	// Affirm that we have what we need to do the work.
	if(array != undefined && list != undefined) {

	    for(var i = 0; i < array.length; i++) {
		
		var node = document.createElement("LI");
		var contents = document.createTextNode(array[i].path);
		node.appendChild(contents);
		list.appendChild(node);
		
	    }
	}
    };

} // end bt.ui module


// Invoke module.
bt.ui();
