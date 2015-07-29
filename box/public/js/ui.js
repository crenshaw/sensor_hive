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
    var lineno = 0;


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

        //get setup experiment container
		var d = document.getElementById('setup_experiment');
        //get lock button
		var b = document.getElementById('lock');
        //get form elements
        var form = document.getElementById('setup_form');
        var elements = form.elements;
        //get form selectors
        var selectorLists = form.getElementsByTagName('select');

		/*
		 * TODO: Create css classes to implement this instead of
		 * using code to alter style!
		 

		// If it's hidden, show it.
		if(d.style.opacity == 0) {
			d.style.border = '1px solid silver';
			d.style.opacity = 1;
			d.style.height = '120px';
			b.style.border = '2px solid #ff0066';
			if (bt.currentUser == null) {
				var checkBox = document.getElementById('cloud_storage');
				checkBox.style.opacity = 0;
			}

		}
		else {
			d.style.opacity = 0;
			d.style.height = 0;
			b.style.border = '2px solid gray';
		}*/
        
        if(d.style.backgroundColor == "rgb(245, 245, 245)"){
            //"unlock" edit function (ie white background and set unlock button)
            d.style.backgroundColor = "rgb(255, 255, 255)";
            b.style.backgroundImage = "url('../icons/unlock.png')";
            //enable form elements
            for (i = 0; i < elements.length; i++){
                elements[i].readOnly = false;
            }
            
            //enable form selector lists
            for (i = 0; i < selectorLists.length; i++) {
                selectorLists[i].disabled = false;
            }
            var checkBox = document.getElementById('cloud_storage');
            if (bt.currentUser == null) {
                checkBox.style.opacity = 0;
            }
            else {
                checkBox.disabled = false;
            }
        }
        else {
            dispatchSetup();
            
            //"lock" edit function (ie gray background and set lock button)
            d.style.backgroundColor = "rgb(245, 245, 245)";
            b.style.backgroundImage = "url('../icons/lock.png')";
            
            //disable form elements
            for (i = 0; i < elements.length; i++){
                elements[i].readOnly = true;
            }
            
            //disable form selector lists
            for (i = 0; i < selectorLists.length; i++) {
                selectorLists[i].disabled = true;
            }
            
            var checkBox = document.getElementById('cloud_storage');
            if (bt.currentUser == null) {
                checkBox.style.opacity = 0;
            }
            else {
                checkBox.disabled = true;
            }
            
            //if button is unlocked, lock and save, if locked, unlock and edit
            //button = document.getElementById('lock'); //REDO ---- Issues after trash button
            
            
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
	    bt.runnable.createExperiment(logging, devices, period, p_units, duration, d_units);
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

    var currentExp = getSelectedExperiment();

	if (action === 'trash') {
        if (currentExp === undefined) {
            return;
        }
        bt.ui.clearDataTable();

        //Don't delete experiments while others are running
        if (bt.runnable.configuration != undefined && bt.runnable.configuration.running) {
            bt.ui.error("Experiments cannot be deleted while an experiment is running.");
            return;
        }

        //Clear the local data on delete
        bt.local.removeExpName(currentExp);
        bt.indexedDB.deleteExperiment(currentExp);

        var selected = document.getElementsByClassName('selected');
        for (var i = 0; i < selected.length; i++) {
            if (selected[i].nodeName == "LI") {
                selected[i].parentElement.removeChild(selected[i]);
            }
        }

	}

	else if(action === 'save') {
        if (currentExp != undefined) {
            bt.local.save(currentExp);
        }
	}

    else if (action === 'upload') {
        if (currentExp != undefined) {
            bt.cloud.pushExperiment(currentExp);
        }
        bt.ui.info("Experiment pushed to server.");
    }
    };

    
    /** 
     * getSelectedExperiment()
     *
     * Return the selected experiment that should be displayed in the
     * data window.
     *
     * @return The name of the selected experiment. If there is no selected
     * experiment, return undefined.
     */
    var getSelectedExperiment = function () {
        var list =document.getElementById('exp_name_list');
        var selected = list.getElementsByClassName('selected');
        if (selected.length == 0) {
            return undefined;
        }
        return selected[0].childNodes[0].data;
    };

    var getRunningExperiment = function () {
        if (bt.runnable.configuration != undefined 
                && bt.runnable.configuration.running) {
            return bt.runnable.configuration.name;
        }
        else {
            return undefined;
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
	 var objects = document.getElementById("local_devices_list").getElementsByClassName('selected');
	 
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

	// SECTION 1: EXPERIMENT-RELATED ACTIONS.

	// CLEAR EXPERIMENT SETTINGS
	// Clearing an experiment has nothing to do with devices, though
	// it should not happen while an experiment is running.
	if (action === 'clearexp') {
	    if (bt.runnable.configuration === undefined) {
		bt.ui.error("Experiment settings are already cleared.");
	    }
	    else if (bt.runnable.configuration != undefined && bt.runnable.configuration.running) {
		bt.ui.error("Cannot clear experiment settings while an experiment is running.");
	    }
	    else {
		// Clear all devices associated with the experiement as not
		// belonging to the experiment.
		bt.runnable.configuration.clear();

		// Git rid of the experiment object and start anew.
		delete bt.runnable.configuration;
		bt.runnable.configuration = undefined;

		// Clear the settings on the user interface.
		bt.ui.experiment();
	    }
		
	    // All done.
	    return;
	}

	// STOP 
	// Stopping an experiment has nothing to do with devices,
	// though it cannot happen if an experiment doesn't exist or
	// isn't running.  It also cannot happen if an experiment is
	// running pc-style logging.
	else if (action === 'stop') {
	    if (bt.runnable.configuration === undefined) {
		bt.ui.error("There is no experiment currently configured.");
	    }
	    else if (!bt.runnable.configuration.running) {
		bt.ui.error("The experiment is already stopped.");
	    }
	    else if (bt.runnable.configuration.logging === 'pc') {
		bt.ui.error("Experiments with desktop-style logging may not be stopped.");
	    }
	    else {
		
		bt.ui.info("Stopping the experiment...");
		// Stop the experiment.
		bt.runnable.configuration.stop();
	    }
	    
	    // All done.
	    return;

	}

	// SECTION 2: DEVICE-RELATED ACTIONS.

	var devices = getSelectedDevices();
	// Did somebody forget to select a device?
	// If so, one cannot continue.
	if(devices === undefined) {
	    bt.ui.error("To " + action + ", please select a device.");
	}

	// Right now, we can only do 1 device at a time.  Make sure the
	// user has only selected 1 device.
	else if (devices.length > 1) {
	    console.log("Please choose only one device bug?");
	    console.log(devices);
	    bt.ui.error("Please choose only one device.");
	}

	// Right now, we must select at least 1 device.  Make sure the
	// user has selected exactly 1 device.
	else if (devices.length != 1) {
	    bt.ui.error("Please select a device.");
	}

	else {
	   
	    if(action === 'lock') {


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
            //Javascript doesn't have a date function that I like 
            //so I'll just generate my own date
            var d = new Date();
            var seconds = d.getSeconds()+1;
            var minutes = d.getMinutes()+1;
            var hours = d.getHours();
            var date = d.getDate();
            var month = d.getMonth()+1;
            var year = d.getFullYear();

            // This adds a zero infront of the value if
            // the value only has a single digit
            if (seconds < 10) {
                seconds = "0" + seconds;
            }
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            if (hours < 10) {
                hours = "0" + hours;
            }

            var timestamp = month + "-" + date + "-" + year + "_" + hours + ":" + minutes + ":" +seconds;
            bt.indexedDB.addExperiment(timestamp);
            bt.runnable.configuration.name = timestamp
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

    /**
     * addDataTableNode()
     * 
     * Creates a new row in the data table. This function assumes
     * that the data comes in from the DAQ in the comma seperated
     * value format. It parses it up and sticks the appropriate data
     * into the appropriate slots.
     *
     * @param text The text to add to the datatable
     * @param logToDB If true or undefined, will be logged to the
     *        indexedDB, if false it will just be added to the table
     */
    var addDataTableNode = function(text, logToDB) {
    
    var exp;
    if (bt.runnable.configuration != undefined && 
            bt.runnable.configuration.running) {
        exp = getRunningExperiment();
    }
    else {
        exp = getSelectedExperiment();
    }

    //If exp is undefined, then it there is no experiment and
    //the user must just be testing the daq
    if (exp == undefined) {
        return;
    }
    if (logToDB === undefined || logToDB === true) {
        bt.indexedDB.addMeasurementToExp(exp,text);
    }

    //Get a handle to the data table body
	var dataTableBody = document.getElementById("data_table_body");


	if(dataTableBody == undefined) {
	    console.log("Cannot get data_table_body"); 
	}
    
    //Parse the datum into an array
    text = lineno + ',' +text;
    lineno++;
    var dataArr = text.split(',');
    var portNumber = parseInt(dataArr[2]);
    var port = document.getElementById("port" + portNumber).value;
    dataArr[2] = port;

    var tr = document.createElement("TR");
    dataTableBody.appendChild(tr);

    //Put the data into the appropriate table slots
    dataArr.forEach(function(d) {
        var td = document.createElement("TD");
        td.innerText = d;
        tr.appendChild(td);
    });
	
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

	// Part 1 -- Setup Menus.

	// Grab the local devices menubar <ul> and add an event handler to it.
	var menu = document.getElementById('local_devices_menu');
	menu.onclick = delegateMenu;

	// Grab the experiment menubar and add an event handler to it.
	menu = document.getElementById('exp_menu');
	menu.onclick = delegateMenu;

	// Grab the data menubar and add an event handler to it.
	menu = document.getElementById('data_menu');
		if (bt.currentUser == null) {
			document.getElementById('upload').style.opacity=0;
		}

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
	/** var button = document.getElementById('cancel');
	button.onclick = toggleSetup;
     */
    
    
        
    //Lock Edit Config Form
        
    //Get setup_experiment elements
    var d = document.getElementById('setup_experiment');
    var b = document.getElementById('lock');
    //Get form elements
    var form = document.getElementById('setup_form');
    var elements = form.elements;
    var selectorLists = form.getElementsByTagName('select');
	
        
        //disable form
        
        //set gray background and set button to lock image
        d.style.backgroundColor = "rgb(245, 245, 245)";
        b.style.backgroundImage = "url('../icons/lock.png')";
        
        //disable form elements
        for (i = 0; i < elements.length; i++){
            elements[i].readOnly = true;
        }
        //disable form selectors
        for (i = 0; i < selectorLists.length; i++) {
            selectorLists[i].disabled = true;
        }
        
        var checkBox = document.getElementById('cloud_storage');
        if (bt.currentUser == null) {
            checkBox.disabled = true;
            checkBox.style.opacity = 0;
        }
        else {
            checkBox.disabled = true;
        }
        
        
        
    };

    /** 
     * experiment()
     *
     * Log some information about the currently configured
     * experiment.
     * 
     * If the function is called with no parameters, just 
     * clear the window.
     *
     */
    bt.ui.experiment = function(devices, period, p_units, duration, d_units, logging)
    {

	// Clear the device list that's already there; we only have
	// one experiment at a time right now.
	infoWindows['exp_window'].clear();	

	// Get handles to everything we'll need.
	var p = document.getElementById('exp_period_setting');
	var d = document.getElementById('exp_duration_setting');
	var l = document.getElementById('exp_logging_setting');
	  
	var msg = "";

	// If we are just clearing the settings...
	if(devices === undefined) {

	    p.innerText = msg;
	    d.innerText = msg;
	    l.innerText = msg;
	
	}
	// Otherwise, add some settings information...
	else {
	   
	    var list = document.getElementById('exp_list');
	    
	    // List all the devices in the experiment.	
	    for(var i = 0; i < devices.length; i++) {
		addNode('exp_list', devices[i]);	
	    }
	    
	    msg = period + " " + p_units;
	    p.innerText = msg;
	    
	    msg = duration + " " + d_units;
	    d.innerText = msg;
	    
	    msg = logging + "";
	    l.innerText = msg;
	    
	    return;

	}
		
    }

    /**
     * indicate()
     *
     * Indicate the device with pathname, 'path', with the supplied
     * state.  These are the possible states:
     *
     * connected: The DAQ is connected to the application.  A dark,
     *            filled circle appears to the left of the device.
     *
     * disconnected: The DAQ is registered with the application, but
     *                currently not connected due to some problem that
     *                needs resolution.  An unfilled circle appears to
     *                the left of the device.
     *
     * experiment: The DAQ is configured with an experiment.  An (e)
     *                appears to the right of the device.
     *
     * disabled: The DAQ is not connected to the application
     *                intentionally.  There is no object for this
     *                device; the device has no decoration.
     * 
     * clear: The DAQ is not configured with an experiment.  No (e)
     *                appears to the right of the device.
     *
     * @param path The pathname associated with the device.  
     *
     * @param state The string 'disconnected', 'connected',
     * 'disabled', 'clear', or 'experiment'.
     *
     */
    bt.ui.indicate = function(path, state) {

	// Grab the local devices window and deselect any other device
	// that may be "selected"
	var list = document.getElementById('local_devices_list').getElementsByTagName('span');

	// Iterate over all the devices in the list.
	for(var i = 0; i < list.length; i++) {
	    
	    // Is this the device?
	    if(list[i].innerText === path) {
		var p = list[i].parentNode;

		if(state === 'connected')
		    p.classList.add('connected');

		else if (state === 'disconnected') {
		    p.classList.remove('connected');
		    p.classList.add('disconnected');

		}
		else if(state === 'disabled') {
		    p.classList.remove('disconnected');
		    p.classList.remove('experiment');
		    p.classList.remove('connected');
		}
		else if(state === 'experiment') {
		    p.classList.add('experiment');
		}
		else if(state === 'clear') {
		    p.classList.remove('experiment');

		}
	    }	
	}
    }
    
    /**
     * serial
     *
     * For debugging purposes, log the raw serial messages sent to and
     * received from the DAQ.
     *
     */
    bt.ui.serial = function(txrx) {
	addNode('serial_list', txrx, 'serial');
	infoWindows['serial'].scroll();

	return;	
    }

    /**
     * log()
     *
     * Log the provided data in the Data Window.
     * 
     * @param datum The data to log.  If no parameter is provided,
     * create a line break in the Data Window.
     */
    bt.ui.log = function(datum) {

	if(datum === undefined) {
        // Now that the datatable is being used, this
        // if statement is only used for gobbling up an
        // undefined datum passed into this function
	}
	
	else {
	    addDataTableNode(datum);

        //scroll the data table to the bottom of the div
	    var dataDiv = document.getElementById("exp_data_div");
        dataDiv.scrollTop = dataDiv.scrollHeight;
	}

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
     * warning()
     * 
     * Display a warning message, m, to the user.
     *
     * @param m The message to display.
     */
    bt.ui.warning = function(m) {
	addNode('alerts_list', m, 'warning');	
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
     * clearDataTable()
     *
     * Clears the text in the data window.
     *
     */
    bt.ui.clearDataTable = function () {
        var dt = document.getElementById("data_table");
        var tb = document.getElementById("data_table_body");
        var newTb = document.createElement("tbody");
        newTb.id = "data_table_body";
        dt.replaceChild(newTb,tb);
    };
    
    /**
     * selectExperiment()
     *
     * When an experiment in the experiments list is clicked, toggle its
     * class between "selected" and "unselected". This function is used to
     * determine what experiment is active and should be displayed.
     */
    bt.ui.selectExperiment = function(e) {
    
    var lastExpSelected = undefined;

    if (e.target.tagName != "LI") {
        return;
    }

    // get the name of the selected experiment. The idea behind
    // the aproach of seleting the child nodes is to avoid
    // getting the save and delete buttons in the string
    if (e.target.childNodes != undefined) {
        lastExpSelected = e.target.childNodes[0].data;   
    }

    // Don't allow selecting an experiment while another is running
    if (bt.runnable.configuration != undefined &&
            bt.runnable.configuration.name != lastExpSelected &&
            bt.runnable.configuration.running) {
        bt.ui.error("Cannot select another experiment, while a current one is running.");
        return;
    }

    lineno = 0;
    if (e.target.childNodes !== undefined) {
        bt.ui.clearDataTable();

        bt.indexedDB.getExperiment(lastExpSelected, function(lines) {
            for (var i = 0; i < lines.length; i++) {
                //Add to the table, but don't select this experiment
                addDataTableNode(lines[i], false);
            }
        });
    }

    // Deselect any experiments that may be selected
	var list = document.getElementById('exp_name_list').getElementsByTagName('li');
	for(var i = 0; i < list.length; i++) {
	    list[i].classList.remove("selected");
	}

	e.target.classList.toggle("selected");
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
