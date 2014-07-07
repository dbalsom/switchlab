
app.controller('uiToolbarController', ['$scope', 'main', '_export', 'ui', 'sim', 'canvas',
    function( $scope, main, _export, ui, sim, canvas ) {
    
    $scope.menu = [{
        name: "file",
        text: "",
        icon: "file",
        items: [{
            name: "Open",
            icon: "open",
            func: $scope.uiOpen
        }, {
            name: "Save",
            icon: "save",
            func: $scope.uiSave
        }, {
            name: "separator"
        }, {
            name: "Reset",
            icon: "trash",
            func: $scope.uiReset
        }]
        }];
    
    $scope.sim = { 
        time: 0
    }
    
    $scope.deviceTypes = [
        "switch", "host"
        ];
    
    $scope.deviceType = { type: "switch" };
    
    $scope.setDeviceType = function(dev) {
        $scope.deviceType.type = dev;
    };
    
    $scope.uiOpen = function() {
    
    };
    $scope.uiSave = function() {
        console.log( _export.toJSON() );
    };
    
    $scope.uiReset = function() {
        ui.msgBox( "Reset Workspace?", "Delete all devices and start a new workspace?" )
            .then( function() { 
                sim.reset();
                canvas.reset();
            });
    };
    
}]);

app.directive('slToolbar', function() {

    return {
    
        restrict: 'EA',
        templateUrl: 'template/toolbar.html',
        controller: 'uiToolbarController'
    };
});