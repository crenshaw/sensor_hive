/**
 * cloud.js
 * 
 * Defines the packaged app's functionality for passing the user's
 * credentials to the remote server for logging in from the app.
 *
 */
var cloudForm = document.getElementById('cloud_submit');

cloudForm.addEventListener('click', function() {
    //Get login info
    var user = document.getElementById('cloud_user').value;
    var pass = document.getElementById('cloud_pass').value;

    var hash = CryptoJS.SHA256(pass);
    pass = hash.toString(CryptoJS.enc.Hex);

    var data = {
        username: user,
        password: pass
    };

    var xhr = new XMLHttpRequest();
    xhr.open('POST','http://ec2-54-69-58-101.us-west-2.compute.amazonaws.com/api/authUser', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(data));
    xhr.onloadend = function () {
        //var currentUserDisplay = document.getElementById('current_user');
          var currentUserDisplay = document.getElementById('login_link');
        if (xhr.responseText === "[true]") {
            //currentUserDisplay.innerHTML = "Logged in as: " + user;
            currentUserDisplay.innerHTML = "Welcome " + user + ", (Logout)";
            bt.ui.delegateLogin();
            bt.currentUser = user;
            bt.currentPass = pass;

            console.log(bt.currentUser, bt.currentPass);
            document.getElementById('cloud_storage').style.opacity=1;
            document.getElementById('upload').style.opacity=1;
        }
        else {
            currentUserDisplay.innerHTML = "Login";

            bt.currentUser = null;
            bt.currentPass = null;

            console.log("Invalid user/pass combination");

            document.getElementById('cloud_storage').style.opacity=0;
            document.getElementById('upload').style.opacity=0;
        }
    };

    return false;
});


