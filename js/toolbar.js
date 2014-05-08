
app.factory('ToolbarData', function ( ui ) {
    return {
        
        menu: [{
            name: "file",
            text: "",
            icon: "file",
            items: [{
                name: "Open",
                icon: "open",
                func: ui.menuOpen
            }, {
                name: "Save",
                icon: "save",
                func: ui.menuSave
            }]
        }]
    }
});

app.controller('ToolbarController', ['$scope', 'main', '_export', 'ToolbarData', 'ui',
    function( $scope, main, _export, ToolbarData, ui ) {
    
    $scope.menu = ToolbarData.menu;
    
    
    $scope.uiOpen = function() {
    
    };
    $scope.uiSave = function() {
        console.log( _export.toJSON() );
    };

    $scope.uiReset = function() {
        ui.toolbarReset();
    };
}]);

app.directive('slToolbar', function() {

    return {
    
        restrict: 'EA',
        templateUrl: 'template/toolbar.html',
        controller: 'ToolbarController'
    };
});