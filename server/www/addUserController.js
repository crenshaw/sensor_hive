var scioWebApp = angular.module('users', ["scioServices"]);

scioWebApp.controller('userControl', function ($scope, AddUser) {

    $scope.currentUser = '';
    $scope.currentPass = '';

    $scope.auth = function () {
        //check for null values
        //hash pass
        //hit api/addUser route with user/pass
        if ($scope.currentUser == '' || $scope.currentPass == '') {
            return;
        }
        var hash = CryptoJS.SHA256($scope.currentPass);
        var pass = hash.toString(CryptoJS.enc.Hex);

        var data = {
            username: $scope.currentUser,
            password: pass
        };

        AddUser.post({},data).$promise.then(function (result) {
            if (result == 'true') {
                console.log("Success");
            }
            else {
                console.log("Add User Failed");
            }
        });
    };

});


var scioServices = angular.module('scioServices', ["ngResource"]);

scioServices.factory("AddUser", function ($resource) {
    return $resource(
        'http://54.69.58.101/api/addUser',
        {},
        {post : {method : 'POST', params: {}, isArray:true}}
    )
});