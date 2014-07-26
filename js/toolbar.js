
app.controller('uiToolbarController', ['$scope', '$interval', 'main', '_export', 'ui', 'state', 'sim', 'simClock', 'canvas',
    function( $scope, $interval, main, _export, ui, state, sim, simClock, canvas ) {
    
    $scope.menu = [{
        name: "file",
        text: "",
        icon: "file",
        items: [{
            name: "Open",
            icon: "folder-open-o",
            func: $scope.uiOpen
        }, {
            name: "Save",
            icon: "save",
            func: $scope.uiSave
        }, {
            name: "separator"
        }, {
            name: "Reset Workspace",
            icon: "trash-o",
            func: $scope.uiReset
        }]
        }];

    $scope.deviceTypes = [
        "switch", "host"
        ];
    
    $scope.deviceType = { type: "switch" };

    $scope.ui_model = ui.getModel();
    $scope.ui_model.editor_mode = "edit"; 

    $scope.sim = { 
        time: simClock.getTime(),
        state: state.get( "sim" ),
        running: false
    };
   
    $scope.$watch('ui_model.editor_mode', function(mode) {
        state.set( "editor", mode );
    });
    
    $scope.$watch('sim.state', function( newState ) {
        if( newState == 'running' ) {
            running = true;
        }
        state.set( "sim", newState );
    });

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

    // Update the simulation clock once a second
    $scope.clockInterval = $interval( function() {
        $scope.sim.time = simClock.getTime();   
    }, 1000 );    
    
    $scope.$on('$destroy', function() {
        console.log( "Destroying interval timer." );
        $interval.cancel( $scope.clockInterval );
    });
    
}]);

app.directive('slToolbar', function() {

    return {
    
        restrict: 'EA',
        templateUrl: 'template/toolbar.html',
        controller: 'uiToolbarController'
    };
});