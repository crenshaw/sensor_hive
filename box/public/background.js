/**
 * background.js
 *
 * The background script defines what the Chrome Packaged App should
 * do when the app is launched.
 *
 * The app has the following behavior:
 *    TODO: ADD DESCRIPTION.
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
	    'width' : 790,
	    'height' : 900
	}
    });   

});

/**
   TODO: Define what to do when the app is closed.
 */

