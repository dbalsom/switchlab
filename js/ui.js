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

// UI Service.  Handles the DOM UI interface elements
app.factory( 'ui', function( _export, $workspace_modal, sim, canvas )
{

    function menuOpen() {
    
    }
    
    function menuSave() {
        console.log( _export.toJSON() );    
    }
    
    function toolbarReset() {
        msgBox( "Reset Workspace?", "Delete all devices and start a new workspace?" ).then( 
            function() { 
                sim.reset();
            });
    }
    
    function msgBox( title, text, icon, buttons ) {
        
        params = { 
            icon: icon ? icon : "exclamation-sign",
            title: title ? title : "",
            text: text ? text : ""
        }
        
        var modalInstance = $workspace_modal.open({
            templateUrl: 'template/msgbox.html',
            controller: 'MsgBoxInstanceController',
            backdrop: true,
            resolve: {
                params: function () {
                    return params;
                }
            }
        });
            
        return modalInstance.result;
    }
    
    
    return { 
        menuOpen:   menuOpen,
        menuSave:   menuSave,
        msgBox:     msgBox,
        toolbarReset: toolbarReset
    }
});