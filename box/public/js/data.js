var data = data || {};

data.indexedDB = {};

data.indexedDB.db = null;

data.indexedDB.open = function () {
    var request = indexedDB.open("experiments", 1);
    request.onupgradeneeded = function(e) {

        var db = e.target.result;

        //e.target.transaction.onerror = data.indexedDB.onerror;

        if (db.objectStoreNames.contains("experiments")) {
            db.deleteObjectStore("experiments");
        }

        var store = db.createObjectStore("experiments", {keyPath: "name"});
    };

    request.onsuccess = function(e) {
        data.indexedDB.db = e.target.result;
    };
};

data.indexedDB.getExperiment = function (expName, callback) {
    var db = data.indexedDB.db;
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
            console.log(expName + " not found in local database.");
            return;
        }
        callback(request.result.measurements);
    };

};

data.indexedDB.addExperiment = function (name, expText) {
    var db = data.indexedDB.db;
    var trans = db.transaction(["experiments"], "readwrite");
    var store = trans.objectStore("experiments");

    var request = store.put({
        "name": name,
        "measurements": []
    });

    trans.oncomplete = function(e) {
        console.log(name + " added to database.");
        data.saveExpName(name);

        var expList = document.getElementById("exp_name_list");

        var li = document.createElement("li");
        var save = document.createElement("a");
        var del = document.createElement("a");
        save.addEventListener("click", function(e) {
            data.save(name);
        });
        del.addEventListener("click", function(e) {
            data.removeExpName(name);
            data.indexedDB.deleteExperiment(name);
            li.parentElement.removeChild(li);
        });
        li.textContent = name;
        save.href='#';
        del.href='#';
        save.textContent = "S";
        del.textContent = "D";
        li.appendChild(save);
        li.appendChild(del);
        expList.appendChild(li);

        
    };

    request.onerror = function (e) {
        console.log(e.value);
    };
};

data.indexedDB.addMeasurementToExp = function (expName, measurement) {
    var db = data.indexedDB.db;
    var trans = db.transaction(["experiments"], "readwrite");
    var store = trans.objectStore("experiments");

    var request = store.get(expName);
    request.onerror = function (e) {
        console.log("Error accessing experiment: " + expName);
        return undefined;
    };

    request.onsuccess = function (e) {
        var data = request.result;
        data.measurements.push(measurement);
        var requestUpdate = store.put(data);
        requestUpdate.onerror = function(e) {
            console.log("Error updating experiment: " + expName);
        };
        requestUpdate.onsuccess = function(e) {
            console.log("Experiment "  + expName + " successfully updated.");
        };
    };
};

data.indexedDB.deleteExperiment = function(expName) {
    var db = data.indexedDB.db;
    var trans = db.transaction(["experiments"], "readwrite");
    var store = trans.objectStore("experiments");

    var request = store.delete(expName);

    trans.oncomplete = function(e) {
        console.log(expName + " succesfully deleted from database.");
    };

    request.onerror = function (e) {
        console.log(e);
        console.log("Error deleting database entry: " + expName);
    };
};

data.save = function (expName) {

    var dataString = "";
    data.indexedDB.getExperiment(expName, function (storedExp) {
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
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent('click', true, true ); // event type,bubbling,cancelable
        link.dispatchEvent(evt);
    });

};

data.saveExpName = function (expName) {
    var data = [];
    chrome.storage.local.get({expNames: []}, function(items) {
        data = items.expNames;
        data.push(expName);
        console.log(data);
        chrome.storage.local.set({expNames: data});
    });

};

data.getExpNames = function (callback) {
    var data = [];
    chrome.storage.local.get({expNames: []}, function(items) {
        data = items.expNames;
        callback(data);
    });
};

data.removeExpName = function (expName) {
    var data = [];
    chrome.storage.local.get({expNames: []}, function(items) {
        for (var i = 0; i < items.expNames.length; i++) {
            if (items.expNames[i] == expName) {
                items.expNames.splice(i,1);
                break;
            }
        }
        chrome.storage.local.set(items);
    });
};
