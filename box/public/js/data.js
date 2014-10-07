/**
 * data.js
 *
 * Description: Contains a set of functions that store information into
 * the host computer's memory. The data structures used are the HTML5 
 * indexed database and Chrome local storage.
 *
 * IndexedDB is a transactional asynchronous API, meaning that lots of
 * callback functions are needed. There is a synchronous API, but no major
 * browser implements it yet.
 *
 * @author Erik Paulson
 * @since 10/6/2014
 */


//Create namespaces
var bt = bt || {};

bt.indexedDB = {};
bt.local = {};

/**
 * indexedDB()
 *
 * Define the user interface module.
 *
 */
bt.indexedDB = function () {
    //A reference to the database
    bt.indexedDB.db = null;

    /**
     * open()
     *
     * Opens the connection to indexedDB. This function must be called
     * before you can interact with the database.
     */
    bt.indexedDB.open = function () {
        var request = indexedDB.open("experiments", 1);

        //onupgradeneeded is the only place where you can change
        //the schema of the database
        request.onupgradeneeded = function(e) {

            var db = e.target.result;

            //TODO Add an error handler
            //e.target.transaction.onerror = bt.indexedDB.onerror;

            if (db.objectStoreNames.contains("experiments")) {
                db.deleteObjectStore("experiments");
            }

            var store = db.createObjectStore("experiments", {keyPath: "name"});
        };

        //On succesfully opening the database, initialize the handle
        request.onsuccess = function(e) {
            bt.indexedDB.db = e.target.result;
        };
    };

    /**
     * getExperiment()
     *
     * Retrieves the array of readings which constitutes an experiment
     *
     * @param expName The name of the experiment to retrieve
     * @param callback A callback function which operates on the retrieved
     *        experiment.
     */
    bt.indexedDB.getExperiment = function (expName, callback) {
        var db = bt.indexedDB.db;
        // Only need to do a readonly for getting experiments
        // readonly is a lot faster (according to the Internet).
        var trans = db.transaction(["experiments"], "readonly");
        var store = trans.objectStore("experiments");

        var request = store.get(expName);

        request.onerror = function (e) {
            console.log("Error accessing experiment: " + expName);
            return;
        };

        request.onsuccess = function(e) {
            // I'm not sure why the error callback isn't called in this
            // case, but this works.
            if (request.result == undefined) {
                console.log(expName + " not found in local btbase.");
                return;
            }
            //Execute the callback on the experiment's array
            callback(request.result.measurements);
        };

    };

    /**
     * addExperiment()
     *
     * Adds a new experiment to the database.
     *
     * @param name The name of the experiment to add
     */
    bt.indexedDB.addExperiment = function (name) {
        var db = bt.indexedDB.db;
        var trans = db.transaction(["experiments"], "readwrite");
        var store = trans.objectStore("experiments");

        var request = store.put({
            "name": name,
            "measurements": []
        });

        trans.oncomplete = function(e) {
            console.log(name + " added to database.");
            //Save the experiment's name in the localstore
            bt.local.saveExpName(name);

            var expListElements = document.getElementById('exp_name_list').getElementsByTagName('li');
            for (var i =0; i < expListElements.length; i++) {
                expListElements[i].classList.remove("selected");
            }

            bt.indexedDB.addToExpList(name,true);
        };

        request.onerror = function (e) {
            console.log(e.value);
        };
    };

    /**
     * addToExpList()
     *
     * Adds an entry in the experiment list for a given experiment.
     *
     * @param name The name of the experiment to add.
     * @param isSelected if true, simulate clicking on this experiment
     *      to select it
     */
    bt.indexedDB.addToExpList = function(name, isSelected) {
            var expList = document.getElementById("exp_name_list");

            var li = document.createElement("li");
            var save = document.createElement("a");
            var del = document.createElement("a");

            // Link to save this experiment to CSV
            save.addEventListener("click", function(e) {
                bt.local.save(name);
            });
            // Link to delete this experiment from local storage
            del.addEventListener("click", function(e) {

                //Don't delete experiments while others are running
                if (bt.runnable.configuration != undefined && bt.runnable.configuration.running) {
                    bt.ui.error("Experiments cannot be deleted while an experiment is running.");
                    return;
                }

                //Clear the datatable if we delete the selected experiment
                if (e.target.parentNode.className == "selected") {
                    bt.ui.clearDataTable(); 
                }

                //Clear the local data on delete
                bt.local.removeExpName(name);
                bt.indexedDB.deleteExperiment(name);
                li.parentElement.removeChild(li);
            });

            li.onclick = bt.ui.selectExperiment;

            // Select an experiment when it gets added to the list
            var expListElements = document.getElementById('exp_name_list').getElementsByTagName('li');
            for (var i =0; i < expListElements.length; i++) {
                expListElements[i].classList.remove("selected");
            }

            li.textContent = name;
            save.href='#';
            del.href='#';
            save.textContent = "S";
            del.textContent = "D";
            li.appendChild(save);
            li.appendChild(del);
            expList.appendChild(li);

            //Simulate a click on the experiment listing
            if (isSelected == true) {
                li.click();
            }

    };

    /**
     * addMeasurementToExp()
     *
     * Adds a data reading to an experiment in the indexedDB.
     *
     * @param expName The name of the experiment to add to
     * @param measurement The line of text to add to the database
     *
     */
    bt.indexedDB.addMeasurementToExp = function (expName, measurement) {
        var db = bt.indexedDB.db;
        var trans = db.transaction(["experiments"], "readwrite");
        var store = trans.objectStore("experiments");

        var request = store.get(expName);
        request.onerror = function (e) {
            console.log("Error accessing experiment: " + expName);
            return undefined;
        };

        request.onsuccess = function (e) {
            //Fetch the experiment's data and append the new line to it
            var data = request.result;
            data.measurements.push(measurement);
            
            //Push it to the database
            var requestUpdate = store.put(data);

            //Logging callbacks
            requestUpdate.onerror = function(e) {
                console.log("Error updating experiment: " + expName);
            };
            requestUpdate.onsuccess = function(e) {
                console.log("Experiment "  + expName + " successfully updated.");
            };
        };
    };


    /**
     * deleteExperiment()
     *
     * Deletes an experiment from the indexed DB
     *
     * @param expName The name of the experiment to delete
     *
     */
    bt.indexedDB.deleteExperiment = function(expName) {
        var db = bt.indexedDB.db;
        var trans = db.transaction(["experiments"], "readwrite");
        var store = trans.objectStore("experiments");

        var request = store.delete(expName);


        //Logging callback
        trans.oncomplete = function(e) {
            console.log(expName + " succesfully deleted from database.");
        };
        request.onerror = function (e) {
            console.log(e);
            console.log("Error deleting database entry: " + expName);
        };
    };
};

/**
 * local()
 *
 * Defiine the bt.local module
 *
 */
bt.local = function () {
    /**
     * save()
     *
     * Saves an experiment to a .csv file. By default it saves
     * as the experiment's name.
     *
     * @param expName The name of the experiment to save
     */
    bt.local.save = function (expName) {

        var dataString = "";

        //Retrieve the experiment from indexedDB
        bt.indexedDB.getExperiment(expName, function (storedExp) {

            //Build the string to save to CSV
            dataString = storedExp[0];
            for (var i = 1; i < storedExp.length; i++) {
                dataString = dataString + "\n" + storedExp[i];
            }
            /*
               Super janky, but it works.
               */
            var link = document.getElementById('save_link');
            console.log(link);
            link.download=expName + ".csv";
            link.href = 'data:application/csv;charset=utf-8,' + encodeURIComponent(dataString);
            link.click();
        });
    };

    /**
     * saveExpName()
     *
     * Save an experiment name to Chrome localStorage
     *
     * @param expName The name to save
     * 
     */
    bt.local.saveExpName = function (expName) {
        var data = [];
        chrome.storage.local.get({expNames: []}, function(items) {
            data = items.expNames;
            data.push(expName);
            console.log(data);
            chrome.storage.local.set({expNames: data});
        });

    };

    /**
     * getExpNames()
     *
     * Gets the array of experiment names from local storage and
     * calls a callback function on the array.
     *
     * @param callback A callback function that receives the array
     * from local storage.
     */
    bt.local.getExpNames = function (callback) {
        var data = [];
        chrome.storage.local.get({expNames: []}, function(items) {
            data = items.expNames;
            callback(data);
        });
    };

    /**
     * removeExpName()
     *
     * Removes an experiment from localStorage. 
     *
     * Note that this assumes that there will be no duplicate experiment names. 
     * This is reasonable right now as the experiment names are the start time
     * of the experiment which is accurate to the second, and experiments take
     * a minimum of 1 second to complete.
     *
     * @param expname The experiment to remove
     */
    bt.local.removeExpName = function (expName) {
        var data = [];
        chrome.storage.local.get({expNames: []}, function(items) {

            //Find the experiment and splice it from the array
            for (var i = 0; i < items.expNames.length; i++) {
                if (items.expNames[i] == expName) {
                    items.expNames.splice(i,1);
                    break;
                }
            }

            //Push the modified array to localStorage
            chrome.storage.local.set(items);
        });
    };
};

// Initialize the modules
bt.indexedDB();
bt.local();
