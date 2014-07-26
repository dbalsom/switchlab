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

app.directive('slInfobox', function( $sanitize ) {

    return {
    
        restrict: 'E',
        template: '<div class="sl-infobox zoom-in glow">' +
                  //'  <div class="sl-infobox-content" ng-bind-html="infobox.html"></div>' +
                  '</div>',
        replace: true,
        controller: ['$scope', function($scope) {

        
        }],
        link: function (scope, element, attrs) {
        
            element.append( '<div class="sl-infobox-content">' 
                            + $sanitize( scope.infobox.html )
                            + '</div>' );
        
            if( scope.infobox.type == "arrow" ) {
                element.append( '<div class="arrow"></div>' );
            }

            console.log( "Elem height: " + element.height() + " Width: " + element.width() );
            console.log( "Elem dist: " + scope.infobox.dist );
                                
            
            switch( scope.infobox.pos ) {
           
                case 'above':
                    element.addClass( "top" );
                    

                    element.css( 'bottom', scope.infobox.y - scope.infobox.dist );
                    element.css( 'left', scope.infobox.x - element.width()/2 );
                    break;
                case 'below':
                    element.addClass( "bottom" );
                    
                    element.css( 'top', scope.infobox.y + scope.infobox.dist );
                    element.css( 'left', scope.infobox.x - element.width()/2 );                    
                    break;
                    
                case 'left':
                    element.addClass( "left" );
                    break;
                    
                case 'right':
                    element.addClass( "right" );
                    break;
                default:
                    element.css( 'top', scope.infobox.y );
                    element.css( 'left', scope.infobox.x );
                    break;
            }


            
        }
    };
});

app.controller('slInfoBoxList', [ '$scope', 
    function( $scope ) {
    
        $scope.infoboxes = [
            { x: 100, y:100, type: "arrow", pos: 'below', dist: 20, html: "<h4>Foo!</h4>" }
            ];
        $scope.addBox = function( box ) {
            $scope.infoboxes.push( box );
            console.log("Added a InfoBox");
        }
    
    }
]);

app.controller('slInfoBoxController', [ '$scope', 
    function( $scope ) {
    
    }
]);
    