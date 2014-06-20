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

    /**
     * delegateMenu
     *
     * When the user clicks on the local devices menubar, this
     * function deploys the corresponding behaviour according to the
     * button that was clicked.
     */
    var delegateMenu = function(e) {

	// Get the id of the target that was clicked and deploy
	// the corresponding action.
	var action = e.target.id

	// Grab all of the devices that are currently "selected" so that
	// we can invoke the action on these devices.
	var objects = document.getElementsByClassName('selected');
	console.log(objects);

	// Did somebody forget to select a device?
	// If so, the code cannot continue.
	if(objects === undefined) {
	    bt.ui.error("To " + id + "You must select a device from 'Local Serial Devices'");
	}

	else {
	    
	    var devices = []

	    // Strip just the devices pathnames from the array of selected
	    // devices.  In other words, convert each complicated DOM
	    // object to simply '/dev/ttyACM0'.
	    for(var i = 0; i < objects.length; i++) {
		devices[i] = objects[i].textContent;
	    }	    
	    
	    // Invoke the configure function using the behaviour
	    // as a parameter.
	    bt.devices.configure(devices, action);
	}
    };

    /**
     * selectDevice()
     *
     * When a device in the "local devices list" is clicked, toggle
     * its class between "selected" and "unselected".  Alter its class
     * accordingly.  Other functions may use this information to alter
     * the "selected device's" configuration.
     */
    var selectDevice = function(e) {

	e.target.classList.toggle("selected");

    };

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt namespace.
    // ************************************************************************


    /**
     * initialize()
     *
     * Initialize the user interface with all the button functionality.
     */
    bt.ui.initialize = function() {

	//
	console.log("Initializing menu");

	// Grab the menubar <ul> and add an event handler to it.
	var menu = document.getElementById('local_devices_menu');
	menu.onclick = delegateMenu;

	// Grab the local devices list and add an event handler to it.
	var list = document.getElementById('local_devices_list');
	list.onclick = selectDevice;
    }

    /**
     * error()
     * 
     * Display an error message, m, to the user.
     *
     * TODO: Create an infobox for this, instead of logging
     * messages to the console.
     */
    bt.ui.error = function(m) {
	console.log(m);
    }
    

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
		
		// Create an empty <li><p class = "local_device"> element 
		var node = document.createElement("LI");
		var p = document.createElement("P");
		p.classList.add("local_device");
		node.appendChild(p);

		// Give it some contents.
		var contents = document.createTextNode(array[i].path);
		p.appendChild(contents);	

		// Add the new <li> element to the list.
		list.appendChild(node);
		
	    }
	}
    };

} // end bt.ui module


// Invoke module.
bt.ui();

