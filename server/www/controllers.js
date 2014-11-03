var scioWebApp = angular.module('scioWebApp', ["scioServices"]);

scioWebApp.controller('ExperimentDataCtrl', function ($scope, DataGather, ExperimentNames) {

    $scope.experiments = ExperimentNames.get({},{});

    $scope.currentExperiment = {};

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

$(function() {
    $('#highcharts').highcharts({
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'Visual Data'
        },
        subtitle: {
            text: 'Zak:Pearson'
        },
        xAxis: {
            type: 'datetime',
            minRange: 3600000 // fourteen days
        },
        yAxis: {
            title: {
                text: 'value'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },
        series: [{
            type: 'area',
            name: 'Temp Data',
            pointInterval: 60000,
            pointStart:Date.UTC(2014,9,28,13,57),
            data: [20.0,20.0,20.0,20.0,20.25]
        }]
    });
});