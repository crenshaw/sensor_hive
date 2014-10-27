var scioWebApp = angular.module('scioWebApp', ["scioServices"]);

scioWebApp.controller('ExperimentDataCtrl', function ($scope, DataGather, ExperimentNames) {

    $scope.experiments = ExperimentNames.get({},{});

    $scope.currentExperiment = {'name' : $scope.experiments[0]};

    $scope.updateCurrentExperiment = function($experiment) {
        $scope.currentExperiment = $experiment;
    };

    $scope.getData = function() {
        $scope.data = DataGather.get({},{'Name': $scope.currentExperiment.experiment_name});
    };



});

var scioServices = angular.module('scioServices', ["ngResource"]);

scioServices.factory("DataGather", function ($resource) {
    return $resource(
        'http://54.69.58.101/api/experiments/get/:Name',
        {Name: "@Name"},
        {get : {method :'GET', params: {}, isArray:true}}
    )
});

scioServices.factory("ExperimentNames", function ($resource) {
    return $resource(
        'http://54.69.58.101/api/experiments/names',
        {},
        {get : {method : 'GET', params : {}, isArray:true}}
    )
});