/**
 * data.js
 * 
 * Defines the packaged app's functionality for locally storing data
 * (offline) received from local devices.
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
    var localDB = null;

    // ************************************************************************
    // Methods local to this module.
    // ************************************************************************

    onerror = function(e) {
	console.log(e.value);
    }

    /**
     * addData()
     *
     * Add some data to the database.
     */
    addData = function(data) {

	// Get a handle to the local database.
	var db = localDB;

	// Construct a well-formed request to the local database.
	var trans = db.transaction(["todo"], "readwrite");
	var store = trans.objectStore("todo");
	var request = store.put({
	    "text" : data,
	    "timeStamp" : new Date().getTime()
	});

	// Set the onsuccess callback function for 
	// the request we've prepared.
	request.onsuccess = function(e) {
	    getData();
	};

	// Set the onerror callback function for
	// the request we've prepared.
	request.onerror = onerror;
    };

    /**
     * getData()
     *
     */
    getData = function() {

	// Get a handle to the data window and clear it.
	var data = document.getElementById('data_list');
	data.innerHTML = "";

	// Get a handle to the local database
	var db = localDB;
	var trans = db.transaction(["todo"], "readwrite");
	var store = trans.objectStore("todo");

	// Get everything in the store.
	var keyRange = IDBKeyRange.lowerBound(0);
	var cursorRequest = store.openCursor(keyRange);

	// Set the onsuccess callback function for this
	// request.
	cursorRequest.onsuccess = function(e) {
	    var result = e.target.result;
	    if(!!result == false)
		return;
	    renderData(result.value);
	    result.continue();
	};

	// Set the onerror callback function for this
	// request.
	cursorRequest.onerror = onerror;
    }


    /**
     * renderData()
     *
     */
    function renderData(row) {

	// Get a handle to the data window.
	var data = document.getElementById('data_list');

	 var li = document.createElement("li");
	var a = document.createElement("a");
	var t = document.createTextNode();
	t.data = row.text;

	a.addEventListener("click", function(e) {
	    html5rocks.indexedDB.deleteTodo(row.text);
	});

	a.textContent = " [Delete]";
	li.appendChild(t);
	li.appendChild(a);
	data.appendChild(li);
    }

    // ************************************************************************
    // Methods provided by this module, visible to others via 
    // the bt namespace.
    // ************************************************************************

    /**
     * open()
     *
     * Open the local database, creating the table if necessary.
     *
     * Based on tutorial found at: 
     *   http://www.html5rocks.com/en/tutorials/indexeddb/todo/
     */
    bt.data.open = function() {
	var version = 1;
	var request = indexedDB.open("todos", version);
	
	// Create an object store in a 'versionchange' transaction.
	// If the open request is successful, and the database's
	// version is higher than the existing database's version, the
	// onupgradeneeded callback is executed.
	//
	// NOTE: This callback is the *only place* in our code were
	// one may alter the structure of the database.
	request.onupgradeneeded = function(e) {
	    var db = e.target.result;

	    e.target.transaction.onerror = onerror;

	    if(db.objectStoreNames.contains("todo")) {
		db.deleteObjectStore("todo");
	    }

	    var store = db.createObjectStore("todo", {keyPath: "timeStamp"});
	};

	request.onsuccess = function(e) {
	    localDB = e.target.result;
	    // getData();
	};

	request.onerror = onerror;
    };


    /**
     * save()
     *
     * Given the data, 'data', download it locally as a .csv file.
     *
     */
    bt.data.save = function(data) {


	// Encode the data.
	console.log(data);

	/*
	  Super janky, but it works.

	var link = document.getElementById('save_link');
	console.log(link);
	link.href = 'data:application/csv;charset=utf-8,' + encodeURIComponent(data);
	var evt = document.createEvent("HTMLEvents");
	evt.initEvent('click', true, true ); // event type,bubbling,cancelable
	return !link.dispatchEvent(evt);
	*/
	
    }

} // end bt.data module


// Invoke module.
bt.data();
