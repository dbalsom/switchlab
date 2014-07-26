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


app.factory( 'notify', function( $timeout )
{
    // Alert types include 'success', 'info', 'warning' and 'danger'
    function write( msg, type, delay ) {
        var notifyScope = angular.element('[ng-controller=uiNotifyController]').scope();
        
        var alert = {};
        
        if( typeof msg === "string" ) {
            alert.msg = msg;
        }
        else if( msg && typeof msg === "object" ) {
            alert.msg = msg.message;
            
            console.log( msg.message );
            console.log( msg.stack );
        }
        else {
            alert.msg = "An unknown error occurred.";
        }
        
        alert.type = type ? type : "danger";
        alert.time = Date.now();
        alert.key  = chance.hash({length: 10});
        
        notifyScope.add( alert, delay );
    }
    return {
        write: write
    }
});

app.controller( 'uiNotifyController', [ '$scope', '$timeout', 'notify',
    function ( $scope, $timeout, notify ) {
    
        $scope.alerts = [];

        $scope.add = function( alert, delay ) {
        
            if( typeof delay === "undefined" ) {
                delay = 3000;
            }
            $scope.alerts.unshift( alert );
            $timeout( 
                function() { 
                    var index = $scope.alerts.indexOf( alert );
                    if( index > -1 ) {
                        $scope.alerts.splice(index, 1);
                    }
                }, 
                delay, true);
        }
    }
]);

app.directive( 'slNotify', function () {

    return {
        restrict: 'E',
        templateUrl: 'template/notify.html'
    }   

});