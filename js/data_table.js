

app.controller('TableController', ['$scope', 
    function( $scope ) {
    // $scope.viewdata = [{ name: "foo" },{ name: "farb" } ];

}]);

app.controller('TableInstanceController', ['$scope', 'uiInfoPanels',
    function( $scope, uiInfoPanels ) {
        
    $scope.tableValues = uiInfoPanels.getPanelValues( $scope.$parent.$index );
    $scope.status = {};
   // $scope.open = true;
    
}]);

app.directive('slDatatable', function() {

    return {
    
        restrict: 'EA',
        templateUrl: 'template/data_table.html',
        controller: 'TableInstanceController',
    };
});