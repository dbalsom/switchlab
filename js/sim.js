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



app.factory( 'mac', function()
{
    'use strict';

    var MAC_OUI = "FCFFFF";
    var _nextMAC = 1;
    
    var _globalMACTable = {};    

    function getUnique() {
        var nic;
        var mac;
        
        do {
            nic = ( "00000"+ _nextMAC.toString(16) ).slice(-6);
            mac = MAC_OUI + nic;
            _nextMAC++;
        } while( !isValid(mac) || isTaken( mac ) );
        
        _globalMACTable[ mac ] = true;
        return mac;
    }    

    function request( mac ) {
        
        if( !_globalMACTable[ mac ] ) {
            _globalMACTable[mac] = true;
            return mac;
        }
        else { 
            return getUnique();
        }
    }
    
    function register( mac ) {
        _globalMACTable[ mac ] = true;
    }
    
    function release( mac ) {
        _globalMACTable[ mac ] = false;
    }
    
    function isTaken( mac ) {
        return _globalMACTable[mac];
    }
    
    function isValid( mac ) {

        // Replace any separator characters
        mac = mac.replace( /[\.:-]/g, '' ).toUpperCase();
              
        // Confirm exactly 12 hex digits
        return mac.match( /[0-9A-F]{12}/ );
    }    
    
    return {
        getUnique:  getUnique,
        request:    request,
        register:   register,
        release:    release,
        isTaken:    isTaken,
        isValid:    isValid
        
    
    
    }

});

app.factory( 'sim', function( mac, Device, SwitchDevice, HostDevice, NetInterface )
{
    'use strict';
    
    var _devices = {};
    
    function getUniqueHostName( name ) {

        var hostName;

        // If we can validate the parameter as a hostname, we will return it
        if( name && isValidHostName( name ) && isUniqueHostName( name )) {
            hostName = name;
        }
        else do { 
            // Otherwise, generate a random unique hostname
            hostName = chance.city().toLowerCase();
        } while( !isValidHostName( hostName ) && !isUniqueHostName( hostName ));
        
        return hostName;
    }
        

    
    function isUniqueHostName( testName ) {
        return ( !_devices[testName.toLowerCase()] );
    }
    
    function isValidHostName( testName ) {

        var hostRegEx = /^([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/i;
        var isValid = false;
        if( testName && testName.length > 0 ) {
            isValid = hostRegEx.test( testName );
        }
        return isValid;        
    }
    
    function getDeviceByHostName( name ) {
        return _devices[name];
    }
    
    function createDevice( type ) {
        
        var newDevice;
        switch( type ) {
            
            case 'switch':
            
                newDevice = new SwitchDevice( { name: getUniqueHostName(), MAC: mac.getUnique() } );
                break;
            case 'host':
            
                newDevice = new HostDevice( { name: getUniqueHostName(), MAC: mac.getUnique() } );
                break;
        
        }
    
        return newDevice;
    }
    
    function addDevice( device ) {
        
        if( !device ) return false;
        
        var name = device.getHostName();
    
        if( isValidHostName( name ) && isUniqueHostName( name ) ) {
            _devices[name] = device;
            return true;
        }
    
        return false;
    };

    function deleteDevice( device ) {
        var devName;
        if( typeof device == 'string' ) {
            devName = device;
        }
        else {
            devName = device.getHostName()
        }
        
        if( _devices[ devName ] ) { 
            _devices[ devName ].destroy();
            delete _devices[ devName ];
        }
    }
  
    function getDeviceNames() {
        var list = [];
        
        list.length = 0;
        for( var device in _devices ) {
        
            if( device != 'length' ) {
                list.push( device );
            }
        }
        return list;
    };
    
    function importModel( modelObject ) {

        // Import pass #1. Create devices and interfaces
        
        if( !modelObject.devices ) {
            throw "importModel: Missing required 'devices' definition.";
        }

        _.forEach( modelObject.devices, function( importDevice ) {
            var conf = {};
            
            if( typeof importDevice.name === "undefined" 
                || typeof importDevice.MAC === "undefined" ) {
                
                throw "importModel: required device parameter missing";
            }
            conf.name = importDevice.name,
            conf.MAC  = mac.request( importDevice.MAC );
            conf.maxInterfaces = importDevice.maxInterfaces;
            
            var newDev = new SwitchDevice( conf );
            addDevice( newDev );
            _.forEach( importDevice.interfaces, function( importInterface ) {
                
                var newInterface = new NetInterface( newDev, importInterface.name );
                
                newInterface.fromJSON( importInterface );
                newDev.addInterface( newInterface );
                
            });
        });
        
        // Import pass #2. Now that all devices and interfaces are created, we can connect them up.
        _.forEach( modelObject.devices, function( importDevice ) {
        
            var srcDev = getDeviceByHostName( importDevice.name );
            if( srcDev ) {
                _.forEach( importDevice.interfaces, function( importInterface ) {
            
                    if( importInterface.hasPhysLink && importInterface.linkedTo ) {
                    
                        // In JSON format, the 'linkedTo' reference is a two part string in the 
                        // format 'interfaceName.deviceName'. Split this string and resolve the
                        // link to an object reference.
                        var dstArgs = importInterface.linkedTo.split('.');
                        if( dstArgs.length == 2 ) {
                            var dstIntName = dstArgs[0];
                            var dstDevName = dstArgs[1];
                            var dstDev = getDeviceByHostName( dstDevName );
                            
                            var srcInt = srcDev.getInterface( importInterface.name );
                            var dstInt = dstDev.getInterface( dstIntName );

                            srcInt.connectTo( dstInt );
                        }                    
                    }
                });
            }
        });
        //console.log( _devices );
    }
    
    function exportModel() {
    
        return { devices: _devices };
    }
    
    function reset() {
        _.forEach( _devices, function( d ) {
            deleteDevice( d );
        });
    }
    
    return {
 
        // Public Methods
        exportModel:            exportModel,
        importModel:            importModel,
        createDevice:           createDevice,
        addDevice:              addDevice,
        deleteDevice:           deleteDevice,
        getDeviceNames:         getDeviceNames,
        getDeviceByHostName:    getDeviceByHostName,
        isValidHostName:        isValidHostName,
        isUniqueHostName:       isUniqueHostName,
        reset:                  reset
    };
    
});

