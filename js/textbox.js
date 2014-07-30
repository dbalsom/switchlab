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

app.directive('slTextbox', function( $sanitize ) {

    return {
    
        restrict: 'E',
        template: '<div class="sl-textbox zoom-in glow">' +
                  //'  <div class="sl-textbox-content" ng-bind-html="textbox.html"></div>' +
                  '</div>',
        replace: true,
        controller: ['$scope', function($scope) {
        
        }],
        link: function (scope, element, attrs) {
        
            element.append( '<div class="sl-textbox-content">' 
                            + $sanitize( scope.textbox.html )
                            + '</div>' );
        
            if( scope.textbox.type == "arrow" ) {
                element.append( '<div class="arrow"></div>' );
            }

            console.log( "Elem height: " + element.height() + " Width: " + element.width() );
            console.log( "Elem dist: " + scope.textbox.dist );
                                
            switch( scope.textbox.pos ) {
           
                case 'above':
                    element.addClass( "top" );

                    element.css( 'bottom', scope.textbox.y - scope.textbox.dist );
                    element.css( 'left', scope.textbox.x - element.width()/2 );
                    break;
                case 'below':
                    element.addClass( "bottom" );
                    
                    element.css( 'top', scope.textbox.y + scope.textbox.dist );
                    element.css( 'left', scope.textbox.x - element.width()/2 );                    
                    break;
                    
                case 'left':
                    element.addClass( "left" );
                    break;
                    
                case 'right':
                    element.addClass( "right" );
                    break;
                    
                case 'at':
                default:
                    element.css( 'top', scope.textbox.y );
                    element.css( 'left', scope.textbox.x );
                    break;
            }
        }
    };
});

app.controller('slTextBoxList', [ '$scope', 
    function( $scope ) {
    
        $scope.textboxes = {};

        $scope.addBox = function( box ) {
            if( box.key ) {
                // Trigger ng-animate on removing the old textbox
                $scope.$apply( function() { 
                    delete $scope.textboxes[box.key];
                });
                $scope.textboxes[box.key] = box;
            }
        }
    
    }
]);

app.controller('slTextBoxController', [ '$scope', 
    function( $scope ) {
    
    }
]);
    