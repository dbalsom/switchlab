
// Abstraction layer between device logic and display logic ( which ideally the device should 
// not know anything about ). Primarily used since a packet has to wait for the canvas animation to
// complete before it is actually received by a device.
app.factory( 'presenter', [ '$injector', function( $injector ) 
{

    var _canvas;
    var _ui;
    
    function requestFramePresentation( srcDevice, srcInterface, frameType, callback ) {
        
        if( !_canvas ) { 
            // Avoid cdep from canvas->Device->netInterface->presenter->canvas
            _canvas = $injector.get('canvas');
        }
      
        var srcNode = _canvas.getNodeByKey( srcDevice.key );
        
        _canvas.sendPacket( srcNode, srcInterface.name, frameType, callback );
    }

    function requestDropPresentation( srcDevice, srcInterface, frameType ) {
        
        if( !_canvas ) {
            _canvas = $injector.get('canvas');
        }
        
        var srcNode = _canvas.getNodeByKey( srcDevice.key );
        _canvas.dropPacket( srcNode, srcInterface, frameType );
    }
    
    function notifyDeviceUpdate( device, type ) {
        if( !_ui ) {
            _ui = $injector.get('ui');
        }
        
        // Only bother sending an update if this is the current selection
        if( device == _ui.getSelectedDevice() ) { 
            var updateScope = angular.element('[ng-controller=uiAccordionController]').scope();
            updateScope.$broadcast( "PANEL_UPDATE", type );
        }
    }
    
    return { 
        requestDropPresentation: requestDropPresentation,
        requestFramePresentation: requestFramePresentation,
        notifyDeviceUpdate: notifyDeviceUpdate
    }

}]);
