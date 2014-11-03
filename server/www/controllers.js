var scioWebApp = angular.module('scioWebApp', ["scioServices"]);

scioWebApp.controller('ExperimentDataCtrl', function ($scope, DataGather, ExperimentNames) {

    $scope.experiments = ExperimentNames.get({},{});

    $scope.currentExperiment = {};
    $scope.startDate = {};

    $scope.currentPort = 1;
    $scope.ports = [1,2,3,4,5,6];

    $scope.changeCurrentPort = function($port) {
        $scope.currentPort = $port;
    };

    $scope.updateCurrentExperiment = function($experiment) {
        $scope.currentExperiment = $experiment;
    };

    $scope.getData = function() {
        $scope.data = DataGather.get({},{'Name': $scope.currentExperiment.experiment_name});
    };

    $scope.updateChart = function() {
        $scope.data.$promise.then(function(stuff) {
            var time1 = stuff[0].timestamp;
            var finalTime = stuff[stuff.length - 1].timestamp;

            var startDate = new Date(time1);

            values = [[], [], [], [], [], []];

            timestamps = [[],[],[],[],[],[]];

            ports = [
                'port 1',
                'port 2',
                'port 3',
                'port 4',
                'port 5',
                'port 6'
            ];

            datapoints = [[],[],[],[],[],[]];

            //console.log(stuff);
            for(index = 0; index < stuff.length; index++) {
                for(port = 1;port<=6;port++) {
                    if(stuff[index].port_number == port) {
                        values[port-1].push(parseFloat(stuff[index].value));
                        timestamps[port-1].push(Date.parse(stuff[index].timestamp));
                        dataPoint = [Date.parse(stuff[index].timestamp), parseFloat(stuff[index].value)];

                        datapoints[port-1].push(dataPoint);
                    }
                }
            }

            console.log(datapoints);

            var seriesOptions = [];
            for(index=0;index<6;index++) {
                if(datapoints[index] != []) {
                    seriesOptions[index] = {
                        name: ports[index],
                        data: datapoints[index]
                    };
                }
            }

            $('#highcharts').highcharts({
                title: {
                    text: 'Visual Data'
                },
                subtitle: {
                    text: $scope.currentExperiment.experiment_name
                },
                xAxis: {
                    type: 'datetime',
                    minRange: finalTime - time1
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
                    series: {
                        compare: 'values'
                    }
                },
                tooltip: {
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
                    valueDecimals: 2
                },
                series: [{
                    type: 'line',
                    name: 'Value',
                    pointInterval: 60000,
                    pointStart:Date.UTC(
                        startDate.getFullYear(),
                        startDate.getMonth(),
                        startDate.getDate(),
                        startDate.getHours(),
                        startDate.getMinutes(),
                        startDate.getSeconds()
                    ),
                    data: values[$scope.currentPort - 1]
                }]
            });
        });
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