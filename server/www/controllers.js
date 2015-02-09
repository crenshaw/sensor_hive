var scioWebApp = angular.module('scioWebApp', ["scioServices"]);

scioWebApp.controller('ExperimentDataCtrl', function ($scope, DataGather, ExperimentNames) {

    $scope.debugAuth = false;

    $scope.experiments = ExperimentNames.get({},{});

    $scope.currentUser = '';
    $scope.currentPass = '';

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

    $scope.authenticUser = function () {
        return $scope.debugAuth;
    };

    $scope.auth = function () {
        $scope.debugAuth = true;
    };

    $scope.download = function() {
        if($scope.hasOwnProperty('data')) {
            var data = $scope.data;
            var name = data[0].experiment_name;

            var headers = "Name, Device, Port, Timestamp, Value";
            var dataString = headers;

            for(var i=0;i<data.length;i++) {
                var dev = data[i].device_number;
                var port = data[i].port_number;
                var time = data[i].timestamp;
                var value = data[i].value;

                dataString = dataString + '\n' + name + ', ' + dev + ', ' + port + ', ' + time + ', ' + value;
            }

            var link = document.getElementById('save_link');
            link.download=name + ".csv";
            link.href = 'data:application/csv;charset=utf-8,' + encodeURIComponent(dataString);
        }
    };

    $scope.updateChart = function() {
        $scope.data.$promise.then(function(stuff) {
            var time1 = stuff[0].timestamp;
            var time2 = stuff[1].timestamp;
            var finalTime = stuff[stuff.length - 1].timestamp;

            var startDate = new Date(time1);
            var nextDate = new Date(time2);

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

            for(index = 0; index < stuff.length; index++) {
                for(port = 1;port<=6;port++) {
                    if(stuff[index].port_number == port) {
                        values[port-1].push(parseFloat(stuff[index].value));
                        timestamps[port-1].push(Date.parse(stuff[index].timestamp));

                        //NOT USED -- Helpful if multiple series per graph is desired
                        dataPoint = [Date.parse(stuff[index].timestamp), parseFloat(stuff[index].value)];
                        datapoints[port-1].push(dataPoint);
                    }
                }
            }

            //NOT USED -- Helpful if multiple series per graph is desired
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
                    text: "Experiment: " + $scope.currentExperiment.experiment_name
                },
                xAxis: {
                    type: 'datetime',
                    minRange: Date.parse(finalTime) - Date.parse(time1)
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
                    pointInterval: nextDate - startDate,
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