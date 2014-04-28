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

app.factory( 'net', function()
{



});

app.factory( 'sim', function() 
{
    'use strict';
    
    var _devices = {};
    var _interfaceStrings = {
            ETHERNET: "et0/",
            FAST_ETHERNET: "fa0/",
            GIG_ETHERNET: "gi0/"
            };
    
    var MAC_OUI = "FCFFFF";
    var _nextMAC = 1;
    
    
    var _globalMACTable = {};
    
    function getUniqueMAC() {
        var nic;
        var mac;
        
        do {
            nic = ( "00000"+ _nextMAC.toString(16) ).slice(-6);
            mac = MAC_OUI + nic;
            _nextMAC++;
        } while( !isValidMAC( mac ) );
        
        _globalMACTable[ mac ] = true;
        return mac;
    }
    
    function getUniqueHostName() {
        var hostName;
        do { 
            hostName = chance.city().toLowerCase();
        } while( !isValidHostName( hostName ) && !isUniqueHostName( hostName ));
        return hostName;
    }
        
    function isValidMAC( mac ) {

        // Replace any separator characters
        mac = mac.replace( /[\.:-]/g, '' ).toUpperCase();
              
        // Confirm exactly 12 hex digits and not already in use
        return mac.match( /[0-9A-F]{12}/ ) && !_globalMACTable[mac];
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
    
    function getNeighbors( deviceName ) {
    
        var neighbors = {};
        var device = _devices[deviceName];
        var neighborName;
        
        if( !device ) return [];
        
        for( var i = 0; i < device._interfaces.length; i++ ) {
            if( device._interfaces[i]._hasPhysLink ) {
                
                neighborName = device._interfaces[i]._linkedTo._host._name;

                if( neighborName ) {
                    if( !neighbors[ neighborName ] ) {
                        neighbors[ neighborName ] = { interfaces: [] };
                    }
                    neighbors[neighborName].interfaces.push( neighborName );
                }
            }
        }
        return neighbors;
    }
    
    function SwitchDevice( name, conf ) {
        
        this._interfaces = [];
        
        if( isValidHostName( name ) && isUniqueHostName( name )) {
            this._name = name;
        } else {
            this._name = getUniqueHostName();
        }
        
        this._MAC = getUniqueMAC();
        
        if( conf ) {
            this._MAC = isValidMAC( conf.MAC ) ? conf.MAC : this._MAC;
        }
            

    }
    
    SwitchDevice.prototype.getHostName
        = function() {
            return this._name;
        };
        
    SwitchDevice.prototype.getAvailableInterface
        = function() {
            for( var i = 0 ; i < this._interfaces.length ; i++ ) {
                // Reuse unplugged interfaces
                if( !this._interfaces[i]._hasPhysLink ) {
                    return this._interfaces[i];
                }
            }
            // All interfaces plugged in? Create a new one
            var newInterface = new NetInterface( this );
            this._interfaces.push( newInterface );
            return newInterface;
        };
        
    SwitchDevice.prototype.connectToHostName
        = function( destName ) {
            var srcInterface = this.getAvailableInterface();
            var dstDevice = _devices[destName];
            if( !dstDevice ) {
                return false;
            }
            var dstInterface = dstDevice.getAvailableInterface();
            
            srcInterface._linkedTo = dstInterface;
            dstInterface._linkedTo = srcInterface;
            srcInterface._hasPhysLink = true;
            dstInterface._hasPhysLink = true;
            return true;
        };
    
    function NetInterface( parent, type ) {
        this._host = parent;
        this._type = type ? type : "FAST_ETHERNET";
        this._name = _interfaceStrings[this._type] + parent._interfaces.length;
        this._hasPhysLink = false;
        this._linkedTo = null;
    }
    
    function getDeviceByHostName( name ) {
        return _devices[name];
    }

    function addDevice( device ) {
    
        _devices[ device._name ] = device;
    };
    
    function getDeviceNames() {
        var list = [];
        
        for( var device in _devices ) {
        
            if( device != 'length' ) {
                list.push( device );
            }
        }
        return list;
    };
    
    function exportModel() {
        var model = {};
        
        model.devices = _.cloneDeep( _devices );
        
        // Convert references to symbolic strings to avoid circular data
        _.forEach( model.devices, function( o ) {
            _.forEach( o._interfaces, function( i ) {
                var remoteHost = i._linkedTo._host._name;
                i._linkedTo = i._linkedTo._name + "." + remoteHost;
            });
        });

        // Now that all interface references are converted, we can 
        // delete convenience host references again to avoid recursion
        _.forEach( model.devices, function( o ) {
            _.forEach( o._interfaces, function( i ) {
                delete i._host; 
            });
        });

        return model;
    }
    
    return {
        // Public Classes
        SwitchDevice:           SwitchDevice,

        // Public Methods
        exportModel:            exportModel,
        addDevice:              addDevice,
        getDeviceNames:         getDeviceNames,
        getNeighbors:           getNeighbors,
        getDeviceByHostName:    getDeviceByHostName,
        isValidMAC:             isValidMAC,
        isValidHostName:        isValidHostName
    };
    
});

