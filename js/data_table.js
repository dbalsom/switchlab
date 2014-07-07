
app.controller('TableInstanceController', ['$scope', 'uiInfoPanels',
    function( $scope, uiInfoPanels ) {
        
        // We need to use the index of the parent scope's ng-repeat to know which 
        // panel we are in. 
        $scope.panel = uiInfoPanels.getPanel( $scope.$parent.$index );
        $scope.tableItems = $scope.panel.items;
        
        $scope.$on( "PANEL_UPDATE", function( event, panelName ) {
            
            try { 
                var panel = $scope.panel;
                
                if( panel.name == panelName ) {
                    //console.log( "Data table received update event." );
                    for( var i = 0; i < panel.items.length; i++ ) {
                    
                        switch( panel.items[i].type ) {
                            
                            case "Grid":
                                //console.log( "Updating ng-grid for panel: " + panelName );
                                
                                $scope.$apply(function () {
                                    $scope.panel.items[i].data = panel.items[i].dataSrc();
                                });
                                
                            break;
                        }
                    }
                    
                }
            } 
            catch( err ) {
                // i'm lazy
            }
        });
        

    }
]);

app.controller('InputValueController', ['$scope',
    function( $scope ) {

        var valid = true;
        var formValid = true;
        
        $scope.change = function( value ) {
            // We usually only get a ng-change event when the model is valid, but we also
            // get one when the model changes from valid to invalid (but only one), therefore we
            // need to check if the form is valid 
            if( this[this.item.name + "Form"].$valid ) {
                this.item.apply( value );
                this.item.startValue = value;
                //console.log( "Changing start value to value: " + value );
            }
        }

        // Called on blur event, we want to reset an invalid input field with the last valid value
        // so that the user isn't left with the standard ng-mask behavior of a blank input field.
        $scope.reset = function() {
            if( !this[this.item.name + "Form"].$valid ) {
                this.item.value = this.item.startValue;
            }
        }
    }
]);

app.controller('OutputValueController', ['$scope',
    function( $scope ) {

        
    
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