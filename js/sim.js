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

var SL = (SL || {});

SL.sim = (function($) {
    var pub = {};

    var _devices = { length: 0 };
    var _interfaceStrings = {
            ETHERNET: "et0/",
            FAST_ETHERNET: "fa0/",
            GIG_ETHERNET: "gi0/"
            };
    
    var MAC_OUI = "FCFFFF";
    var _nextMAC = 1;
    var _globalMACTable = [];
    
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
        } while( !isValidHostName( hostName ) );
        return hostName;
    }
    
    function isValidMAC( mac ) {
        // primarily, make sure there isn't a duplicate MAC on the network
        if( _globalMACTable[mac] ) {
            return false;
        }
        return true;
    }

    function isValidHostName( testName ) {

        var hostRegEx = /^([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/i;
        var isValid;
        if( testName && testName.length > 0 ) {
            isValid = hostRegEx.test( testName );
        }

        if( isValid ) {
            // does device name already exist?
            return ( !_devices[testName.toLowerCase()] );
        }
        return false;        
    }
    
    function getNeighbors( deviceName ) {
        var neighbors = [];
        var device = _devices[deviceName];
        var neighborName;
        
        if( !device ) return [];
        
        for( i = 0; i < device._interfaces.length; i++ ) {
            if( device._interfaces[i]._hasPhysLink ) {
                neighborName = device._interfaces[i]._linkedTo._host._name;

                if( neighborName ) {
                    neighbors.push( neighborName );
                }
            }
        }
        
        return neighbors;
    }
    
    pub.dSwitch = function( name ) {
        
        this._interfaces = [];
        
        if( pub.isValidHostName( name ) ) {
            this._name = name;
        } else {
            this._name = getUniqueHostName();
        }
        
        this._MAC = getUniqueMAC();
        
        this.getHostName = function() {
            return this._name;
        };
        
        this.getAvailableInterface = function() {
            for( i = 0 ; i < this._interfaces.length ; i++ ) {
                // Reuse unplugged interfaces
                if( !this._interfaces[i]._hasPhysLink ) {
                    return this._interfaces[i];
                }
            }
            // All interfaces plugged in? Create a new one
            var newInterface = new dInterface( this );
            this._interfaces.push( newInterface );
            return newInterface;
        }
        
        this.connectToHostName = function( destName ) {
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
        }
    };
    
    function dInterface( parent, type ) {
        this._host = parent;
        this._type = type ? type : "FAST_ETHERNET";
        this._name = _interfaceStrings[this._type] + parent._interfaces.length;
        this._hasPhysLink = false;
        this._linkedTo = null;
    }
    
    function getDeviceByHostName( name ) {
        return _devices[name];
    }

    pub.addDevice = function( device ) {
    
        _devices[ device._name ] = device;
        _devices.length++;
    };
    
    pub.getDeviceNames = function() {
        var list = [];
        
        for( device in _devices ) {
        
            if( device != 'length' ) {
                list.push( device );
            }
        }
        return list;
    };
    
    pub.getNeighbors = getNeighbors;
    pub.getDeviceByHostName = getDeviceByHostName;
    pub.isValidMAC = isValidMAC;
    pub.isValidHostName = isValidHostName;
    return pub;
    
}(jQuery));

