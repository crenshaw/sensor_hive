/**
 * ui.js
 * 
 * Defines the packaged app's functionality for instrumenting the user-interface.
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


    // *** INFORMATION WINDOWS REGISTRY *** 
    //
    // Information windows are registered according to their unique
    // HTML identifier.  Thus, the format is, {identifier: info
    // object}.
    var infoWindows = {}

    // ************************************************************************

    // *** INFO OBJECT DEFINITION ***

    /**
     * info()
     *
     * The info object is the software representation of each
     * information window in the user inferface.  This is the
     * constructor for the object.  
     *
     * An information window is represented by its id and its
     * handle to the DOM.
     *
     * To initialize an instance of the object requires:
     *
     * @param id The HTML identifier associated with the information
     * window on the user interface.  The id is used to get the handle
     * and initialize it for the object.
     *
     *
     */
    function info(id) {
	this.id = id;

	var handle = document.getElementById(id);
	this.handle = handle;
    };

    // Update the prototype for all objects of type info.  They share
    // the same methods.
    info.prototype.clear = clear;
    info.prototype.scroll = scroll;

    /**
     * clear()
     *
     * Invoked on an info object, this method clears all of the information
     * in the window.
     *
     */
    function clear() {

	// Get the <ul> child of this node and delete all its
	// <li> elements.
	var u = this.handle.children[0];

	u.innerHTML = "";
    }

    
    /**
     * scroll()
     * 
     * Invoked on an info object, this method keeps the new
     * information added to the bottom of a window at the bottom of
     * the window.  That is, scrolling is aligned to the bottom; older
     * information is hidden as new information is added.
     * 
     */
    function scroll() {
	this.handle.scrollTop = this.handle.scrollHeight;
    }

    // Done defining info() object.


    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************

    /**
     * toggleSetup()
     *
     * Show or hide the experiment setup menu.
     *
     */
    var toggleSetup = function() {
	

	// Either we are trying to hide the experiment setup menu or
	// we are trying to show it.
	
	var d = document.getElementById('setup_experiment');
	var b = document.getElementById('setup');

	/*
	 * TODO: Create css classes to implement this instead of
	 * using code to alter style!
	 */

	// If it's hidden, show it.
	if(d.style.opacity == 0) {
	    d.style.border = '1px solid silver';
	    d.style.opacity = 1;
	    d.style.height = '93px';
	    b.style.border = '2px solid #ff0066';
	    
	}
	else {
	    d.style.opacity = 0;
	    d.style.height = 0;	    
	    b.style.border = '2px solid gray';
	}
    };

    /**
     * dispatchSetup()
     *
     * Obtain the user-entered information for the experiment and
     * prepare to call setup() for the proper device.
     *
     */
    var dispatchSetup = function() {
	
	// Get all the selected devices.
	var devices = getSelectedDevices();
	
	if(devices === undefined) {
	    bt.ui.error("To configure an experiment, please select at least one device.");

	}

	else {
	    // Get type of logging.
	    var logging = document.getElementById('logging').value;

	    // Get period.
	    var period = parseInt(document.getElementById('period').value);
	    
	    // Get units.
	    var p_units = document.getElementById('period_units').value;

	    // Get duration.
	    var duration = parseInt(document.getElementById('duration').value);

	    // Get units. 
	    var d_units = document.getElementById('duration_units').value;

	    // Okay, we are ready to make an experiment.  Use
	    // createExperiment() to make sure the input isn't crappy
	    // and from there, create an experiment object.  Call
	    // toggleSetup() when all done, as indicated by final
	    // parameter.
	    bt.runnable.createExperiment(logging, devices, period, p_units, duration, d_units, toggleSetup);
	}

    };


    /**
     * alertsMenu
     *
     * When the user clicks the alerts menubar, this function deploys the 
     * corresponding behaviour according to the button that was clicked.
     */
    var alertsMenu = function(e) {

	// Get the id of the target that was clicked and deploy
	// the corresponding action.
	var target = e.target;
	var action = target.id

	if (action === 'trash') {
	    bt.ui.clear(target);
	}
    }
    
    /**
     * dataMenu
     *
     * When the user clicks the data menubar, this function deploys the 
     * corresponding behaviour according to the button that was clicked.
     */
    var dataMenu = function(e) {

	// Get the id of the target that was clicked and deploy
	// the corresponding action.
	var target = e.target;
	var action = target.id

	if (action === 'trash') {
	    bt.ui.clear(target);
	}

	else if(action === 'save') {
	   
	    // Get the data from the data window and
	    // save it to a local file. 
	    var data = bt.ui.getData();
	    bt.data.save(data);
	}

    }

    /**
     * getSelectedDevices() 
     *
     * Extract all of the selected devices from the UI.  Return 
     * an array of device pathnames or 'undefined' if no devices
     * are selected.
     *
     */
     var getSelectedDevices = function() {

	 // Grab all of the devices that are currently "selected" so that
	 // we can invoke the action on these devices.
	 var objects = document.getElementsByClassName('selected');
	 
	 if (objects === undefined) {
	     return undefined;
	 }

	 else {

	     var devices = []
	     
	     // Strip just the devices pathnames from the array of selected
	     // devices.  In other words, convert each complicated DOM
	     // object to simply '/dev/ttyACM0'.
	     for(var i = 0; i < objects.length; i++) {
		 devices[i] = objects[i].textContent;
	     }	    
	     
	     return devices;
	 }
     };
    

    /**
     * delegateMenu()
     *
     * When the user clicks on the local devices menubar, this
     * function deploys the corresponding behaviour according to the
     * button that was clicked.
     */
    var delegateMenu = function(e) {

	// Get the id of the target that was clicked and deploy
	// the corresponding action.
	var action = e.target.id
	
	var devices = getSelectedDevices();
	
	// Did somebody forget to select a device?
	// If so, one cannot continue.
	if(devices === undefined) {
	    bt.ui.error("To " + action + ", please select a device.");
	}

	// Right now, we can only do 1 device at a time.  Make sure the
	// user has only selected 1 device.
	else if (devices.length > 1) {
	    bt.ui.error("Please choose only one device.");
	}

	// Right now, we must select at least 1 device.  Make sure the
	// user has selected exactly 1 device.
	else if (devices.length != 1) {
	    bt.ui.error("Please select a device.");
	}
	   
	else {
	   
	    if(action === 'setup') {

		// Perform a lookup for each device and affirm that it
		// is connected before allowing the user to configure
		// the device.
		for(var i = 0; i < devices.length; i++) {
		    
		    var d = bt.devices.lookup(devices[i]);
		    if (d == undefined || !d.connected ) {
			var path = devices[i];
			bt.ui.error(devices[i] + " is not enabled.  Please enable the device before configuring an experiment.");
			return;
		    }

		}

		toggleSetup();
	    }
		
	    // The 'go' action is related to the application's experiment object.
	    else if(action === 'go') {
		
		if (bt.runnable.configuration === undefined) {
		    bt.ui.error("No experiment has been configured.");
		}
		else {
		    bt.runnable.configuration.start();
		}

	    }

	    // All the other actions are related to the devices.
	    else {	
		// Invoke the configure function using the behaviour
		// as a parameter.
		bt.devices.configure(devices, action);
	    }
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

	lastDeviceSelected = e.target.textContent;

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

	return;
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


	// Part 1 -- Setup Menus.

	// Grab the local devices menubar <ul> and add an event handler to it.
	var menu = document.getElementById('local_devices_menu');
	menu.onclick = delegateMenu;

	// Grab the experiment menubar and add an event handler to it.
	menu = document.getElementById('exp_menu');
	menu.onclick = delegateMenu;

	// Grab the data menubar and add an event handler to it.
	menu = document.getElementById('data_menu');
	menu.onclick = dataMenu;

	// Grab the alerts menubar and add an event handler to it.
	menu = document.getElementById('alerts_menu');
	menu.onclick = alertsMenu;



	// Part 2 -- Setup selection highlighting

	// Grab the local devices list and add an event handler to it.
	var list = document.getElementById('local_devices_list');
	list.onclick = selectDevice;



	// Part 3 -- Create an object for each information window.
	// This makes it easier to implement 'clear' (i.e., the trash
	// button) for every window.
	
	// First, get all of the elements of class 'info'
	var iws = document.getElementsByClassName('info');
	
	// Then, for each element...
	for(var i = 0; i < iws.length; i++) {
	    var id = iws[i].id;     // Get the id
	    var io = new info(id)   // Make a new info object.
	    infoWindows[id] = io;   // Register it.
	}



	// Part 4 -- Setup Configuration Menu.

	// Setup the buttons in the setup_experiment div.
	var button = document.getElementById('cancel');
	button.onclick = toggleSetup;

	button = document.getElementById('done');
	button.onclick = dispatchSetup;
	
    };

    /** 
     * experiment()
     *
     * Log some information about the currently configured
     * experiment.
     *
     */
    bt.ui.experiment = function(devices, period, p_units, duration, d_units)
    {

	// Clear the device list that's already there; we only have
	// one experiment at a time right now.
	infoWindows['exp_window'].clear();	

	var list = document.getElementById('exp_list');

	// List all the devices in the experiment.	
	for(var i = 0; i < devices.length; i++) {
	    addNode('exp_list', devices[i]);	
	}

	var setting = document.getElementById('exp_period_setting');
	var msg = period + " " + p_units;
	setting.innerText = msg;

	setting = document.getElementById('exp_duration_setting');
	msg = duration + " " + d_units;
	setting.innerText = msg;

	return;
	
    }

    /**
     * indicate()
     *
     * Indicate the device with pathname, 'path', is connected or 
     * disconnected, registered or removed from the registry, or
     * configured with an experiment.
     *
     * @param path The pathname associated with the device.  
     *
     * @param state The string 'disconnected', 'connected',
     * 'registered', 'removed', or 'experiment'.
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
		else if(state === 'registered')
		    p.classList.add('registered');
		else if(state === 'removed') {
		    p.classList.remove('registered');
		    p.classList.remove('experiment');
		}
		else if(state === 'experiment')
		    p.classList.add('experiment');
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
	addNode('data_list', datum, 'data');
	infoWindows['data_window'].scroll();
	
	return;
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
	infoWindows['alerts'].scroll();

	return;
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
     */
    bt.ui.info = function(m) {
	addNode('alerts_list', m, 'info');	
	infoWindows['alerts'].scroll();

	return;
    };
    
    /**
     * clear
     *
     * Given a target trashcan button that was clicked, clear the
     * appropriate data window.
     *
     */
    bt.ui.clear = function(target) {

	// The classes of the target indicate the associated
	// info window.  Get the classes of the target.  The
	// one that is found in the infoWindows registry
	// should be the one that is cleared.
	var c = target.className.split(' ');

	for(var i = 0; i < c.length; i ++) {
	    
	    var o = infoWindows[c[i]];
	    if(o != undefined) {
		o.clear();
	    }
	}

	return;
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

    /**
     * getData()
     *
     * Slurp all the data currently logged to the data window and
     * return it as a giant string.
     */
    bt.ui.getData = function() {    

	var result = "";

	// Get everything in the DOM of class 'data'.  This is an
	// array of <p> elements, where each p is a line of data from
	// the data window.
	var list = document.getElementsByClassName('data');
	
	for(var i = 0; i < list.length; i++) {
	    result += list[i].textContent + "\n";
	}

	return result;
	
    };

} // end bt.ui module


// Invoke module.
bt.ui();

