/**
 * background.js
 *
 * The background script defines what the Chrome Packaged App should
 * do when the app is launched.
 *
 * The app affirms that the machine's bluetooth adapter is on and then
 * gets a particular device's information.
 *
 * Initial code based on tutorial here:
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
	    'width' : 400,
	    'height' : 500
	}
    });   

});

