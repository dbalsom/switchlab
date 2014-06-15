

app.controller('TableController', ['$scope', 
    function( $scope ) {
    // $scope.viewdata = [{ name: "foo" },{ name: "farb" } ];

}]);

app.controller('TableInstanceController', ['$scope', 'uiInfoPanels',
    function( $scope, uiInfoPanels ) {
        
        $scope.tableItems = uiInfoPanels.getPanelItems( $scope.$parent.$index );

    }
]);

app.controller('InputValueController', ['$scope',
    function( $scope ) {
    
        $scope.$watch( 'item.value', function(newVal, oldVal, scope) {
            if( scope.item.$valid ) {
                 console.log( "You may touch my nethers.");
            }
            else {
                    console.log( "I HAVE MURDERED MEN FOR LESS" );
            }
        }); 
    }
]);

app.directive('slDatatable', function() {

    return {
        require: 'ngSwitch',
        restrict: 'EA',
        templateUrl: 'template/data_table.html',
        controller: 'TableInstanceController',
    };
});