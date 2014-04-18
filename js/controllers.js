

// http://the.longaccess.com/developers/2013/11/20/angular-ui-hex-input-mask/
// Thanks to Konstantinos Koukopoulos 

var app = angular.module('SLApp', ['ui.bootstrap', 'ui.mask']);

app.run(function() {

});

app.controller('MainUIController', ['$scope', 'uiMaskConfig', 
    function ($scope, uiMaskConfig) {
 
 
    uiMaskConfig.maskDefinitions['H']=/[0-9a-fA-F]/;
    $scope.ui_model = {};
    $scope.ui_model.app_mode = "add"; 
    $scope.tabs = [];
    $scope.selectedSwitch = {};
    
    //$scope.tabs = SL.main.getSwitchList();
    $scope.updateTabs = function() {
        
        //console.log( "updateTabs() triggered" );
        $scope.tabs = SL.sim.getDeviceNames();
        $scope.selectedSwitch = SL.main.getSelectedSwitch();
    
    };
    $scope.myalert = function() {
        SL.main.export();
    };
    $scope.$watch('ui_model.app_mode', function(mode) {
        SL.main.setMode( mode );
    });
    $scope.$watch('selectedSwitch.name', function(name) {
        console.log( SL.sim.isValidHostName( name ));
        //SL.canvas.update();
    });
    
}]);


