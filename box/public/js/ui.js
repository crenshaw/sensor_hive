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
    var lastDeviceSelected;

    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************

    /**
     * dataMenu
     *
     * When the user clicks the data menubar, this function deploys the 
     * corresponding behaviour according to the button that was clicked.
     */
    var dataMenu = function(e) {

	// Get the id of the target that was clicked and deploy
	// the corresponding action.
	var action = e.target.id

	if (action === 'trash') {
	    bt.ui.clear();
	}

	else if(action === 'save') {

	}

    }

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
	
	// Did somebody forget to select a device?
	// If so, the code cannot continue.
	if(objects === undefined) {
	    bt.ui.error("To " + id + "You must select a device from 'Local Serial Devices'");
	}

	// Right now, we can only do 1 device at a time.  Make sure the
	// user has only selected 1 device.
	else if (objects.length > 1) {
	    bt.ui.error("Please choose only one device.");
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

	lastDeviceSelected = e.target;

	// Grab the local devices window and deselect any other device
	// that may be "selected"
	var list = document.getElementById('local_devices_list').getElementsByTagName('span');

	for(var i = 0; i < list.length; i++) {
	    list[i].classList.remove("selected");
	}

	e.target.classList.toggle("selected");

    };

    /**
     * addNode()
     * 
     * Create a DOM node for the given selector, 'sel', with the given
     * 'text' and optional class, 'c'.  Add the newly created node as
     * a child to the given selector.
     *
     * The DOM node shall be:
     *
     * <LI><P CLASS='c'>text</P></LI>
     * 
     * Seems super specific, but it works for all windows in the user
     * interface.
     */
    var addNode = function(sel, text, c) {

	// Grab the unique selector
	var s = document.getElementById(sel);

	if(s == undefined) {
	    console.log("Cannot get " + sel); 
	}

	// Create an empty <li> element 
	var node = document.createElement("LI");
	var p = document.createElement("P");
	node.appendChild(p);
	
	// Give it some contents.
	var contents = document.createTextNode(text);
	p.appendChild(contents);	

	// Give it a class, if one was supplied.
	if(c != undefined) {
	    p.classList.add(c);
	}

	// Add the new <li> element to the list.
	s.appendChild(node);

    }

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

	// Grab the local devices menubar <ul> and add an event handler to it.
	var menu = document.getElementById('local_devices_menu');
	menu.onclick = delegateMenu;

	// Grab the local devices list and add an event handler to it.
	var list = document.getElementById('local_devices_list');
	list.onclick = selectDevice;

	// Grab the data menubar and add an event handler to it.
	menu = document.getElementById('data_menu');
	menu.onclick = dataMenu;
    };

    /**
     * indicate()
     *
     * Indicate the device with pathname, 'path', is connected or 
     * disconnected.
     *
     * @param path The pathname associated with the device.
     * @param state The string 'disconnected' or 'connected'.
     */
    bt.ui.indicate = function(path, state) {

	// Grab the local devices window and deselect any other device
	// that may be "selected"
	var list = document.getElementById('local_devices_list').getElementsByTagName('span');

	// Iterate over all the devices in the list.
	for(var i = 0; i < list.length; i++) {
	    
	    // Is this the device just connected?
	    if(list[i].innerText === path) {
		var p = list[i].parentNode;

		if(state === 'connected')
		    p.classList.add('connected');
		else if (state === 'disconnected')
		    p.classList.remove('connected');
	    }
	}		
    }
    
    /**
     * log()
     *
     * Log the provided data in the Data Window.
     * 
     * @param datum The data to log.
     */
    bt.ui.log = function(datum) {
	addNode('data_list', datum);
    };


    /**
     * error()
     * 
     * Display an error message, m, to the user.
     *
     * @param m The message to display.
     */
    bt.ui.error = function(m) {
	addNode('alerts_list', m, 'error');	
    };

    /**
     * info()
     * 
     * Display an info message, m, to the user.
     *
     * @param m The message to display.
     *
     * TODO: Should info messages be a different color or
     * have an icon or something?
     *
     * TODO: make info() and error() less copy-paste.
     */
    bt.ui.info = function(m) {
	addNode('alerts_list', m, 'info');	
    };
    
    /**
     * clear
     *
     * Clear the data window.
     *
     * TODO: For cleaner code, I need to create a window object that
     * has methods such as clear() or log().  Stay tuned.
     *
     */
    bt.ui.clear = function() {
	var win = document.getElementById('data_list');
	win.innerHTML = "";
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
		var p = document.createElement("SPAN");
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

