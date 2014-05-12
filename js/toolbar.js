
app.controller('ToolbarController', ['$scope', 'main', '_export', 'ui', 'sim', 'canvas',
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
        }]
        }];
    
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
        controller: 'ToolbarController'
    };
});