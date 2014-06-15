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
            alert.msg = "An unknown error occured.";
        }
        
        alert.type = type ? type : "danger";
        
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
            $scope.alerts.push( alert );
            $timeout( 
                function() { 
                    var index = $scope.alerts.indexOf( alert );
                    if( index > -1 ) {
                        $scope.alerts.splice(index, 1)
                    }
                }, 
                delay, true);
        }
    }
]);


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
        $scope.tabs = [];
        $scope.keys = [];
        $scope.selectedSwitch = {};
        
        $scope.updateTabs = function() {
            
            $scope.devices = sim.getDeviceInfo();
            $scope.tabs.length = 0;
            $scope.keys.length = 0;
            
            for( var device in $scope.devices ) {
                $scope.tabs.push( $scope.devices[device].name );
                $scope.keys.push( $scope.devices[device].key );
            }
            //$scope.selectedSwitch = main.getSelectedSwitch();
        };
        
        $scope.$watch( 'devices', function() {
        
            $timeout( ui.attachConsoles, 10 );
            console.log( "Tabs changed, have: " + $scope.tabs.length + " tabs" );
        }); 
    }
]);    

// Panel Service delivers the data model to the accordion and data table controllers
app.factory( 'uiInfoPanels', function() {

    var _panelList = [];
    
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
    
    function GridItem( array, columnDefs ) {
        this.type   = "Grid";
        this.array  = array;
        this.gridOptions = {    data: 'item.array',
                                columnDefs: columnDefs,
                                headerRowHeight: 24,
                                rowHeight: 20,
                                multiSelect: false,
                                plugins: [new ngGridFlexibleHeightPlugin()]
                                
                           };        
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
        GridItem:       GridItem,
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
app.factory( 'ui', function( $workspace_modal, $timeout, sim, uiInfoPanels )
{

    var ui_model = { add_type: "switch" };
    

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

    function selectDevice( selectionKey ) {
    
        var selectedDevice = sim.getDeviceByKey( selectionKey );
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
                    validator: 
                        function( name ) {
                            var isValid = (name == selectionName) 
                                            || sim.isValidHostName( name )
                                            && sim.isUniqueHostName( name );
                            if( isValid && ( name != selectionName )) {
                                //throw new Error( "Stack trace me");
                                //selectedDevice.setHostName( name );
                                console.log( "updating in validator... hmm");
                                updateTabs();
                            }                                    
                            return isValid;        
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
                         { field: '', displayName: '' }
                         
                         ];
        var newItem = new uiInfoPanels.GridItem( selectedDevice.getInterfaces(), colDefs );
        newPanel.addItem( newItem );        
    
    }
    
    function attachConsoles() {
        
        var devices = sim.getDevices();
        
        _.forEach( devices, function( device ) {
        
            device.devConsole.attachTo( device.key );
        });
    }
    
    function updatePanels() {
        var updateScope = angular.element('[ng-controller=uiAccordionController]').scope();
        $timeout( function() { updateScope.updatePanels() }, 0, true );
    }
    
    function updateTabs() {
        var updateScope = angular.element('[ng-controller=uiTabController]').scope();
        $timeout( function() { updateScope.updateTabs() }, 0, true ); 
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
        selectDevice:   selectDevice,
        updatePanels:   updatePanels,
        updateTabs:     updateTabs,
        attachConsoles: attachConsoles,
        msgBox:         msgBox
    }
});