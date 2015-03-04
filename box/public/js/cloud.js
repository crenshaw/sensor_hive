

var bt = bt || {};

bt.cloudLogin = function() {
    //Get login info
    var user = document.getElementById('cloud_user').value;
    var pass = document.getElementById('cloud_pass').value;

    var hash = CryptoJS.SHA256(pass);
    pass = hash.toString(CryptoJS.enc.Hex);

    var data = {
        username: user,
        password: pass
    };

    console.log(JSON.stringify(data));

    var xhr = new XMLHttpRequest();
    xhr.open('POST','http://54.69.58.101/api/authUser', true);
    xhr.setRequestHeader('Content-Type', 'text/plain; charset=UTF-8');
    xhr.send(JSON.stringify(data));
    xhr.onloadend = function () {
        console.log(xhr.responseText);
    };

    return false;
};


