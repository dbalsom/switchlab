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

app.controller('AlertController', [ '$scope', '$workspace_modal', 
    function ($scope, $workspace_modal ) {
    
        $scope.params = { 
            icon: "exclamation-sign",
            title: "This is a title.",
            text:  "This is some text."
        }
        $scope.openAlert = function() {
            console.log( "openAlert() fired." );
        
            var modalInstance = $workspace_modal.open({
                templateUrl: 'template/msgbox.html',
                controller: 'MsgBoxInstanceController',
                backdrop: true,
                resolve: {
                    params: function () {
                        return $scope.params;
                    }
                }
            });
            modalInstance.result.then(function (selectedItem) {
                console.log( "Got OK!" );
            });
        }
        

    }]);
    
app.controller('MsgBoxInstanceController', [ '$scope', '$modalInstance', 'params',
    function ($scope, $modalInstance, params ) {

        $scope.icon  = params.icon;
        $scope.title = params.title;
        $scope.text  = params.text;
        
        $scope.ok = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

    }]);
    
    
