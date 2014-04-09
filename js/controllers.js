

// http://the.longaccess.com/developers/2013/11/20/angular-ui-hex-input-mask/
// Thanks to Konstantinos Koukopoulos 

var app = angular.module('STPApp', ['ui.bootstrap', 'ui.mask']);

app.controller('LogTabsController', ['$scope', 'uiMaskConfig', 
    function ($scope, uiMaskConfig) {
 
 
    uiMaskConfig.maskDefinitions['H']=/[0-9a-fA-F]/;
    $scope.tabs = [];
    $scope.selectedSwitch = {};
    
    //$scope.tabs = STP.main.getSwitchList();
    $scope.updateTabs = function() {
        
        console.log( "updateTabs() triggered" );
        $scope.tabs = STP.main.getSwitchList();
        $scope.selectedSwitch = STP.main.getSelectedSwitch();
    }
    
}]);


