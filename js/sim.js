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
        return mac.match( /^[0-9A-F]{12}$/ );
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

app.factory( 'simClock', function()
{
    var _time  = 0;
    return {
        getTime: function() { return _time; },
        setTime: function(time) { _time = time },
        tick: function(delta) { _time += delta }
    }
});

app.factory( 'sim', function( simClock, events, state, mac, Device, SwitchDevice, HostDevice, 
                              NetInterface )
{
    'use strict';
    var DELTA_MAX = 500;

    // Each device is primarily identified by its hash key into the 'devices' object.
    var _devices = Object.create(null);
    
    function createKey() {
        do {
            var key = chance.hash({length: 6});
        } while( _devices[key] ); // We loop on the odd chance we have a collision
        return key;
    }
    
    function getUniqueHostName( name ) {

        var hostName;

        // If we can validate the parameter as a hostname, we will return it
        if( name && isValidHostName( name ) && isUniqueHostName( name )) {
            hostName = name;
        }
        else do { 
            // Otherwise, generate a random unique hostname
            hostName = chance.word({syllables: 3});
        } while( !isValidHostName( hostName ) && !isUniqueHostName( hostName ));
        
        return hostName;
    }
        
    function isUniqueHostName( testName ) {
        //return ( !_devices[testName.toLowerCase()] );
        return true;
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
        return _.find( _devices, { 'name': name });
    }
    
    function getDeviceByKey( key ) {
        return _devices[key];
    }
    
    function getDeviceByMAC( MACaddress ) {
        return _.find( _devices, { 'MAC': MACaddress } );
    }
    function createDevice( type ) {
        
        var newDevice;
        switch( type ) {
            
            case 'switch':
                newDevice = new SwitchDevice( 
                                    { key: createKey(), 
                                      name: getUniqueHostName(), 
                                      MAC: mac.getUnique() } );
                break;
            case 'host':
                newDevice = new HostDevice( 
                                    { key: createKey(), 
                                      name: getUniqueHostName(), 
                                      MAC: mac.getUnique() } );
                break;
            default:
                throw new Error( "createDevice: Invalid device type specified: " + type );
                break;
        }
    
        return newDevice;
    }
    
    function addDevice( device ) {
        
        if( !device ) return false;
        
        var key = device.getKey();
    
        if( !_devices[key] ) {
            _devices[key] = device;
            return true;
        }
        else {
            throw new Error( "Device with key "+key+" already exists." );
        }
    };

    function deleteDevice( device ) {
        var devKey;
        if( typeof device == 'string' ) {
            devKey = device;
        }
        else {
            devKey = device.getKey()
        }
        
        if( _devices[ devKey ] ) { 
            _devices[ devKey ].destroy();
            delete _devices[ devKey ];
            return true;
        }
        
        throw new Error( "deleteDevice: Invalid device: " + devKey );
        return false;
    }
  
    function getDeviceInfo() {
        var infoList = [];
        
        _.forEach( _devices, function( device ) {
            infoList.push({ name: device.getHostName(), key: device.getKey() });
        });
        return infoList;
    }
    
    function getDeviceNames() {
        var nameList = [];
        
        _.forEach( _devices, function( device ) {
            nameList.push( device.getHostName() );
        });
        return nameList;
    }
    
    function getDevices() {
    
        return _devices;
    }
    
    // The meat of the simulation logic is driven here. 
    // Currently the tick handler is called by the EaselJS tick event
    function tick( delta ) {
    
        // Certain conditions can cause the tick handler be delayed (changing tabs, etc)
        // Rather than freak out trying to catch up over a long delta period, we will just skip
        // this tick and pick up on the next one.
        if( delta > DELTA_MAX ) { 
            return;
        }
    
        // events queued with post() are now sent out
        events.dispatch();
    
        if( state.get('sim') == "running" ) {
            simClock.tick( delta );

            _.forEach( _devices, function( device ) {
                device.tick( delta );
            });        
        }
    }    

    function importModel( modelObject ) {

        var conf = {};
        var key;
        // Import pass #1. Create devices and interfaces
        if( !modelObject.devices ) {
            throw new Error( "importModel: Missing required 'devices' definition." );
        }

        for( key in modelObject.devices ) {
            var importDevice = modelObject.devices[key];
           
            if( typeof importDevice.name === "undefined" 
                || typeof importDevice.MAC === "undefined" ) {
                
                throw new Error( "importModel: required device parameter missing" );
            }
            
            conf.key  = key;
            conf.name = importDevice.name,
            conf.MAC  = mac.request( importDevice.MAC );
            conf.maxInterfaces = importDevice.maxInterfaces;

            var newDev;
            switch( importDevice.type ) {
            
                case "switch":
                    newDev = new SwitchDevice( conf );
                    break;
                case "host":
                    newDev = new HostDevice( conf );
                    break;
                default:
                    throw new Error( "Invalid device type." );
                    break;
            }

            addDevice( newDev );
            
            _.forEach( importDevice.interfaces, function( importInterface ) {
                var newInterface = new NetInterface( newDev, importInterface.name );
                
                newInterface.fromJSON( importInterface );
                newDev.addInterface( newInterface );
            });
        }
        
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
                            var dstDevKey  = dstArgs[1];
                            var dstDev = getDeviceByKey( dstDevKey );
                            
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
        tick:                   tick,
        exportModel:            exportModel,
        importModel:            importModel,
        createDevice:           createDevice,
        addDevice:              addDevice,
        deleteDevice:           deleteDevice,
        getDevices:             getDevices,
        getDeviceInfo:          getDeviceInfo,
        getDeviceNames:         getDeviceNames,
        getDeviceByHostName:    getDeviceByHostName,
        getDeviceByMAC:         getDeviceByMAC,
        getDeviceByKey:         getDeviceByKey,
        isValidHostName:        isValidHostName,
        isUniqueHostName:       isUniqueHostName,
        reset:                  reset
    };
    
});

