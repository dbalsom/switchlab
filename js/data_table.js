

app.controller('TableController', ['$scope', 
    function( $scope ) {
    // $scope.viewdata = [{ name: "foo" },{ name: "farb" } ];

}]);

app.controller('TableInstanceController', ['$scope', 'uiInfoPanels',
    function( $scope, uiInfoPanels ) {
        
    $scope.tableItems = uiInfoPanels.getPanelItems( $scope.$parent.$index );
    $scope.status = {};
   // $scope.open = true;
    
    $scope.getTableHeight = function(item) {
        //console.log("height");
        return { height: (item.array.length * 21 + 24) + "px" };
    
    };
    
}]);

app.directive('slDatatable', function() {

    return {
        require: 'ngSwitch',
        restrict: 'EA',
        templateUrl: 'template/data_table.html',
        controller: 'TableInstanceController',
    };
});