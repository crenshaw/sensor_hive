
var scioWebApp = angular.module('scioWebApp', ["scioServices", "selectize", 'ui.select', 'ngSanitize']);

scioWebApp.controller('ExperimentDataCtrl', function ($scope, DataGather, ExperimentNames, AuthUser) {

    $scope.Auth = false;

    $scope.loading = false;

    $scope.experiments = '';

    $scope.currentUser = '';
    $scope.currentPass = '';

    $scope.currentExperiment = {};
    $scope.startDate = {};

    $scope.currentPort = 1;
    $scope.ports = [1,2,3,4,5,6];

    $scope.changeCurrentPort = function($port) {
        $scope.currentPort = $port;
        $scope.updateChart();
    };

    $scope.updateCurrentExperiment = function($experiment) {
        $scope.currentExperiment = $experiment;
        $scope.data = DataGather.get({},{'Name': $scope.currentExperiment.experiment_name});
        $scope.updateChart();
    };

    //$scope.getData = function() {
    //    $scope.data = DataGather.get({},{'Name': $scope.currentExperiment.experiment_name});
    //};

    $scope.authenticUser = function () {
        return $scope.Auth;
    };

    $scope.auth = function () {
        $scope.loading = true;

        var hash = CryptoJS.SHA256($scope.currentPass);
        hash = hash.toString(CryptoJS.enc.Hex);

        var data = {
            username: $scope.currentUser,
            password: hash
        };
        AuthUser.post({},data).$promise.then(function (result) {
            if (result == 'true') {
                $scope.Auth = true;
                $scope.experiments = ExperimentNames.get({},{});
            }
            else {
                $scope.loading = false;
            }
        });
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

    //$scope.selectedItem = $scope.experiments[0];

    $scope.itemArray = [
        {id: 1, name: 'first'},
        {id: 2, name: 'second'},
        {id: 3, name: 'third'},
        {id: 4, name: 'fourth'},
        {id: 5, name: 'fifth'},
    ];

    $scope.selectedItem = $scope.experiments[0];

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
        'http://54.186.225.109/api/experiments/get/:Name',
        {Name: "@Name"},
        {get : {method :'GET', params: {}, isArray:true}}
    )
});

scioServices.factory("ExperimentNames", function ($resource) {
    return $resource(
        'http://54.186.225.109/api/experiments/names',
        {},
        {get : {method : 'GET', params : {}, isArray:true}}
    )
});

scioServices.factory("AuthUser", function ($resource) {
    return $resource(
        'http://54.186.225.109/api/authUser',
        {},
        {post : {method : 'POST', params: {}, isArray:true}}
    )
});