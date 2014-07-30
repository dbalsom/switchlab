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

app.directive( 'ico', function() {
    return {
        restrict: 'EA',
        scope: { type: '@i' },
        template: '<span class="fa fa-fw" ng-class="\'fa-{{type}}\'"></span>'
    };
});

app.controller( 'uiMainController', [ '$scope', '$workspace_modal',
                                      'uiMaskConfig',
                                      'state', 'sim', 'simClock', 'ui',
    function ($scope, $modal, uiMaskConfig, state, sim, simClock, ui ) {
 
    uiMaskConfig.maskDefinitions['H'] = /[0-9a-fA-F]/;

}]);

app.controller( 'uiAccordionController', [ '$scope', '$timeout', 'uiInfoPanels',
    function ( $scope, $timeout, uiInfoPanels ) {
    
        $(".panel-heading").addClass( "accordion-toggle" );
        
        $scope.panels = [];
        $scope.open = true;

        $scope.clearPanels = function() {
            $scope.panels.length = 0;
        };

        $scope.updatePanels = function() {
            $scope.panels = uiInfoPanels.getPanelList();
        };
    }
]);

app.controller( 'uiTabController', [ '$scope', '$timeout', 'sim', 'ui',
    function( $scope, $timeout, sim, ui ) {
    
        $scope.devices = [];

        $scope.updateTabs = function() {
            $scope.devices = sim.getDeviceInfo();
        };
        
        $scope.$watch( 'devices', function() {
            $timeout( ui.attachConsoles, 10 );
            //console.log( "Tabs changed, have: " + $scope.tabs.length + " tabs" );
        }); 
        
    }
]);    

app.controller( 'uiCmdController', [ '$scope', '$timeout', 'sim', 
    function( $scope, $timeout, sim ) {
    
        $scope.exec = function( ) {
            var execDevice = sim.getDeviceByKey( this.device.key );
            execDevice.exec( this.input );
        };    
   
    }
]);


// Panel Service delivers the data model to the accordion and data table controllers
app.factory( 'uiInfoPanels', function() {

    var _panelList = [];
    var DEBOUNCE_TIME = 300;
    
    function getPanelList() {
        return _.clone(_panelList);
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
        this.type       = "InputValue";
        this.name       = params.name;
        this.value      = params.value;
        this.startValue = params.value; // We hold on to the starting value to use as an exception
                                        // when checking for uniqueness. 
        this.min   = params.min;
        this.max   = params.max;
        this.mask  = params.mask;
        // If no validator supplied, provide a default one that always validates
        this.validate = params.validate ? params.validate : function(){ return true; };
        
        // We debounce the apply function so that we don't call it on every keystroke. 
        this.apply    = params.apply ? _.debounce( params.apply, DEBOUNCE_TIME )
                            : function() { return };
    }
    
    function OutputValueItem( params ) {
        this.type  = "OutputValue";
        this.name  = params.name;
        this.value = params.value;
    }
    
    function ObjectItem( keys, object ) {
        this.type   = "Object";
        this.keys   = keys;
        this.object = object;
    }
    
    function ComboItem( params ) {
        this.type   = "Combo";
        this.name   = params.name;
        this.value  = params.init;
        this.values = params.values;
    
    }

    function ArrayItem( headerKey, keys, array ) {
        this.type   = "Array";
        this.headerKey = headerKey;
        this.keys   = keys;
        this.array  = array;
    }
    
    function GridItem( dataSrc, columnDefs ) {
        this.type    = "Grid";
        this.dataSrc = dataSrc;
        this.data    = dataSrc();
        
        this.gridOptions = {    data: 'item.data',
                                columnDefs: columnDefs,
                                headerRowHeight: 24,
                                rowHeight: 20,
                                multiSelect: false,
                                plugins: [new ngGridFlexibleHeightPlugin()]
                           };        
    }
    
    function Panel( name, open ) {
        this.name  = name;
        this.open  = open;
        this.index = -1;
        
        this.items = [];
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
            // TODO: panel destructor here
        });
        _panelList.length = 0;
    }
    
    return {

        InputValueItem: InputValueItem,
        OutputValueItem: OutputValueItem,
        ComboItem:      ComboItem,
        GridItem:       GridItem,
        ObjectItem:     ObjectItem,
        ArrayItem:      ArrayItem,
        Panel:          Panel,
        
        addPanel:       addPanel,
        delPanel:       delPanel,
        reset:          reset,
        getPanel:       getPanel,
        getPanelItems:  getPanelItems,
        getPanelList:   getPanelList
    }
});
    
    
// UI Service.  Handles various DOM UI interface elements
app.factory( 'ui', function( $workspace_modal, $timeout, sim, uiInfoPanels, STP_CONSTANTS )
{

    var ui_model = { add_type: "switch" };
    
    var selectedDevice = null;
    
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

    function updateSelectedDevice() {
    
    }
    
    function selectDevice( selectionKey ) {
    
        selectedDevice = sim.getDeviceByKey( selectionKey );
        var selectionName = selectedDevice.getHostName();
        
        var newPanel = new uiInfoPanels.Panel( "General", true );
        uiInfoPanels.addPanel( newPanel );

        var nameValue = 
            new uiInfoPanels.InputValueItem(
                {    
                    name: "Name",
                    value: selectionName,
                    type: "string",
                    min: 1,
                    max: 63,
                    validate: 
                        function( name ) {
                            var isValid = (name == selectionName) 
                                            || sim.isValidHostName( name )
                                            && sim.isUniqueHostName( name );
                            return isValid;        
                        },
                    apply: 
                        function( name ) {
                            if( name != selectionName ) {
                                updateTabs();
                            }
                            selectedDevice.setHostName( name );
                        }
                });
                                                  
        newPanel.addItem( nameValue );
        
        var macValue = 
            new uiInfoPanels.InputValueItem(
                { 
                    name: "MAC",
                    value: selectedDevice.getMAC(),
                    type: "string",
                    min: 12,
                    max: 12,
                    mask: "HH:HH:HH:HH:HH:HH"
                });
        newPanel.addItem( macValue );    

        newPanel = new uiInfoPanels.Panel( "Interfaces", true );
        uiInfoPanels.addPanel( newPanel );
        
        var colDefs =   [{ field: 'name', displayName: "Name", width: "20%" },
                         { field: 'vlan', displayName: "vlan", width: "15%" },
                         { field: 'hasPhysLink', displayName: "Link", width: "15%", cellTemplate: "template/link_cell.html" },
                         { field: 'STP.state', displayName: 'STP' }
                         
                         ];
        var newItem = new uiInfoPanels.GridItem( selectedDevice.getInterfaces, colDefs );
        newPanel.addItem( newItem );        
    
        if( selectedDevice.type == "switch" ) {
        
            /* Set up MAC Address Table panel */
            newPanel = new uiInfoPanels.Panel( "MAC Address Table", true );
            uiInfoPanels.addPanel( newPanel );
            
            var colDefs = [{ field: 'MAC', displayName: "MAC", width: "45%" },
                           { field: 'vlan', displayName: "vlan", width: "15%" },
                           { field: 'ifaceName', displayName: "Int", width: "20%" },
                           { field: 'age', displayName: "age" }
                           ];
                           
            newItem = new uiInfoPanels.GridItem( selectedDevice.getMACTable, colDefs );
            newPanel.addItem( newItem );

            /* Set up Spanning Tree Protocol parameters panel */
            newPanel = new uiInfoPanels.Panel( "Spanning Tree", true );
            uiInfoPanels.addPanel( newPanel );
            
            newItem = new uiInfoPanels.ComboItem( 
                                { name: "Mode", init: "STP", values: [ "Off", "STP", "RSTP" ] });
            newPanel.addItem( newItem );
        
            newItem = new uiInfoPanels.ComboItem( 
                                { name: "Priority", init: 32768, values: STP_CONSTANTS.priorities });
                                
            newPanel.addItem( newItem );        
            
            var BID = selectedDevice.STP.getBridgeID();
            newItem = new uiInfoPanels.OutputValueItem( { name: "Bridge ID", value: BID } );
            newPanel.addItem( newItem );
            
            var RID = selectedDevice.STP.getRootID();
            newItem = new uiInfoPanels.OutputValueItem( { name: "Root ID", value: RID } );
            newPanel.addItem( newItem );
                

            
        }
    
    }
    
    function getSelectedDevice() {
        return selectedDevice;
    }
    
    function attachConsoles() {
        
        var devices = sim.getDevices();
        
        _.forEach( devices, function( device ) {
        
            device.devConsole.attachTo( device.key );
        });
    }
    
    function requestCanvasUpdate() {
        
    }
    
    function updatePanels() {
        var updateScope = angular.element('[ng-controller=uiAccordionController]').scope();
        $timeout( function() { updateScope.updatePanels() }, 0, true );
    }
    
    function updateTabs() {
        var updateScope = angular.element('[ng-controller=uiTabController]').scope();
        $timeout( function() { updateScope.updateTabs() }, 0, true ); 
    }
    
    function updateClock() {
        var updateScope = angular.element('[ng-controller=uiToolbarController]').scope();
        updateScope.$apply();
    }
    
    function addTextBox( box ) {
        var updateScope = angular.element('[ng-controller=slTextBoxList]').scope();
        $timeout( function() { updateScope.addBox( box ) }, 0, true );
    }
    
    function getModel() {
        return ui_model;
    }
    
    function getEditorMode() {
        return ui_model.editor_mode;
    }
    
    function getEditorAddType() { 
        return ui_model.add_type;
    }
    
    return { 
        getModel:       getModel,
        getEditorMode:  getEditorMode,
        getEditorAddType:   getEditorAddType,
        selectDevice:       selectDevice,
        getSelectedDevice:  getSelectedDevice,
        updateClock:    updateClock,
        updatePanels:   updatePanels,
        updateTabs:     updateTabs,
        addTextBox:     addTextBox,
        attachConsoles: attachConsoles,
        msgBox:         msgBox
    }
});