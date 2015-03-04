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

    console.log(JSON.stringify(data));

    var xhr = new XMLHttpRequest();
    xhr.open('POST','http://ec2-54-69-58-101.us-west-2.compute.amazonaws.com/api/authUser', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(data));
    xhr.onloadend = function () {
        console.log(xhr.responseText);
    };

    return false;
});


