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

app.controller( 'uiAccordionController', [ '$scope', 'uiInfoPanels',
    function ( $scope, uiInfoPanels ) {
    
        $(".panel-heading").addClass( "accordion-toggle" );
        
        $scope.panels;
        
        $scope.open = true;
        $scope.updatePanels = function() {
            //console.log( "updatePanels()" );
            $scope.panels = uiInfoPanels.getPanelList();
        };
    }]);

// Panel Service delivers the data model to the accordion and data table controllers
app.factory( 'uiInfoPanels', function() {

    var _panelList = [];
    
    function getPanelList() {
        return _panelList;
    }

    function getPanel( panelParam ) {
        var panel = null;
        switch( typeof panelParam ) {
            case 'string':
                panel = _.find( _panelList, { 'name': panelParam });
                break;
            case 'number':
                panel = _panelList[ panelParam ];
                break;
        }
        
        return panel;
    }                
    
    function getPanelItems( panelParam ) {
    
        var panel = getPanel( panelParam );
        if( panel ) {
            return panel.items;
        }            
    }

    function InputValueItem( params ) {
        this.type  = "InputValue";
        this.name  = params.name;
        this.value = params.value;
        this.min   = params.min;
        this.max   = params.max;
        this.mask  = params.mask;
        // If no validator supplied, provide a default one that always validates
        this.validator = params.validator ? params.validator : function(){ return true; };
    }
    
    function ObjectItem( keys, object ) {
        this.type   = "Object";
        this.keys   = keys;
        this.object = object;
    }

    function ArrayItem( headerKey, keys, array ) {
        this.type   = "Array";
        this.headerKey = headerKey;
        this.keys   = keys;
        this.array  = array;
    }
    
    function Panel( name, open ) {
        this.name   = name;
        this.open   = open;
        this.index  = -1;
        
        this.items      = [];
    }
    
    Panel.prototype.addItem = function( item ) {
        
        this.items.push( item );
    }

    function addPanel( panel ) {
        panel.index = _panelList.push( panel ) - 1;
    }

    function delPanel( panel ) {
        _panelList.splice( panel.index, 1 );
    }
    
    function reset( panel ) {
        _.forEach( _panelList, function( panel ) {
            // panel destructor here
        });
        _panelList.length = 0;
    }
    
    return {

        InputValueItem: InputValueItem,
        ObjectItem:     ObjectItem,
        ArrayItem:      ArrayItem,
        Panel:          Panel,
        
        addPanel:       addPanel,
        delPanel:       delPanel,
        reset:          reset,
        getPanelItems:  getPanelItems,
        getPanelList:   getPanelList
    }
});
    
    
// UI Service.  Handles various DOM UI interface elements
app.factory( 'ui', function( $workspace_modal, $timeout, sim )
{

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

    function updatePanels() {
        var updateScope = angular.element('[ng-controller=uiAccordionController]').scope();
        $timeout( function() { updateScope.updatePanels() }, 0, true );
    }
    
    function updateTabs() {

        var updateScope = angular.element('[ng-controller=MainUIController]').scope();
        $timeout( function() { updateScope.updateTabs() }, 0, true ); 
    }
    
    return { 
        updatePanels:   updatePanels,
        updateTabs:     updateTabs,
        msgBox:         msgBox
    }
});