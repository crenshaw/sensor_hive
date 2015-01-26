/**
 * background.js
 *
 * The background script defines what the Chrome Packaged App should
 * do when the SCIO app is launched:
 *
 * Open a small window containing four small information areas:
 * - a list of `Local Devices`
 * - a `System Log`
 * - a summary of the current `Experiment Configuration`
 * - the `Data` collected during any testing or experiments.
 *
 * Initial code based on tutorials here:
 *  https://developer.chrome.com/apps/app_bluetooth
 */


/**
 * onLaunched()
 *
 * This event is fired when the user starts the app.  It immediately
 * opens a window for the app of the specified width and height.
 *
 */
chrome.app.runtime.onLaunched.addListener(function() {

    // Create the window
    chrome.app.window.create('window.html', {
	'bounds' : {
	    'width' : 820,
	    'height' : 800
	}
    });   

});

/**
   TODO: Define what to do when the app is closed.
   Essentially, I just need to close all the serial ports.
 */

