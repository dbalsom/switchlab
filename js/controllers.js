/*
SwitchLab
Copyright (c) 2014 Daniel Balsom

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// http://the.longaccess.com/developers/2013/11/20/angular-ui-hex-input-mask/
// Thanks to Konstantinos Koukopoulos 

app.controller('MainUIController', ['$scope', 'uiMaskConfig','main', 'state', 'sim', 
    function ($scope, uiMaskConfig, main, state, sim ) {
 
    uiMaskConfig.maskDefinitions['H'] = /[0-9a-fA-F]/;
    $scope.ui_model = {};
    $scope.ui_model.app_mode = "add"; 
    $scope.tabs = [];
    $scope.selectedSwitch = {};
    
    $scope.updateTabs = function() {
        
        //console.log( "updateTabs() triggered" );
        $scope.tabs = sim.getDeviceNames();
        $scope.selectedSwitch = main.getSelectedSwitch();
    
    };

    $scope.$watch('ui_model.app_mode', function(mode) {
        state.set( mode );
    });
    $scope.$watch('selectedSwitch.name', function(name) {
        console.log( sim.isValidHostName( name ));
        //SL.canvas.update();
    });
    
}]);


app.controller('ToolbarController', ['$scope', 'main', '_export', 
    function( $scope, main, _export ) {
    
    $scope.uiSave = function() {
        console.log( _export.toJSON() );
    };
    
    
}]);

