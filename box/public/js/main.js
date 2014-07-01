/**
 * main.js
 * 
 * Defines the packaged app's behavior upon loading the
 * window.  
 *
 */

// Extend the namespace
var bt = bt || {};


/**
 * main()
 *
 * Update the window.onload property with the function, init_main,
 * that defines the initial behavior of the app.
 * 
 */
bt.main = function() {

    // The intention of this approach is to be framework-agnostic
    // and to avoid namespace pollution by encapsulating the contents of 
    // the module in a function called bt.main().

    function init_main(){
	
	// Initialize the user interface and the devices
	// handler.
	bt.ui.initialize();
	bt.devices.initialize();

	// Open the local database, creating the table if necessary.
	bt.data.open();

	// Scan for local devices.
	bt.devices.scan();	
    }

    if(window.attachEvent) {
	window.attachEvent('onload', init_main);
    } else {
	if(window.onload) {
            var curronload = window.onload;
            var newonload = function() {
		curronload();
		init_main();
            };
            window.onload = newonload;
	} else {
            window.onload = init_main;
	}
    }
}
bt.main();
