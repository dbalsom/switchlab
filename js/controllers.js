
var app = angular.module('STPApp', ['ui.bootstrap']);

app.controller('LogTabsController', function($scope) {
    $scope.tabs = STP.main.getSwitchList();
    console.log($scope.tabs.length);
    
    $scope.$watch( $scope.tabs.length, function() {
        
    });
    
});

