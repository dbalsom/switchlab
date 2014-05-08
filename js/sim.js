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
    var _interfaceTypes = {
            et: "Ethernet",
            fa: "FastEthernet",
            gi: "GigabitEthernet",
            lo: "Loopback",
            tu: "Tunnel"
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
    
    function getUniqueHostName( name ) {

        var hostName;

        if( name && isValidHostName( name ) && isUniqueHostName( name )) {
            hostName = name;
        }
        else do { 
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
      
    function SwitchDevice( conf ) {
        
        this._interfaces = [];
        var name = "";
        
        if( typeof conf == "string" ) {
            this._name  = getUniqueHostName( conf );     
            this._MAC   = getUniqueMAC();
        }
        else if( typeof conf == "object" ) {
            this._name = getUniqueHostName( conf.name );
            this._MAC  = isValidMAC( conf.MAC ) ? conf.MAC : this._MAC;
        }
    }

    SwitchDevice.prototype.getHostName
        = function() {
            return this._name;
        };

    SwitchDevice.prototype.getNeighbors 
        = function () {
    
        var neighbors = {};
        var neighborName;
        
        for( var i = 0; i < this._interfaces.length; i++ ) {
            if( this._interfaces[i]._hasPhysLink ) {
                
                neighborName = this._interfaces[i]._linkedTo._host._name;

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
    
    SwitchDevice.prototype.addInterface
        = function( newInterface ) {
            
            if( newInterface ) {
                this._interfaces.push( newInterface );
            }
        };
        
    SwitchDevice.prototype.getAvailableInterface
        = function() {
            for( var i = 0; i < this._interfaces.length; i++ ) {
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
        
    SwitchDevice.prototype.getInterface = function( name ) {
        
            for( var i = 0; i < this._interfaces.length; i++ ) {
                if( this._interfaces[i]._name == name ) {
                    return this._interfaces[i];
                }
            }
            return null;
        };
        
    SwitchDevice.prototype.connectToHostName = function( dstName, dstInterfaceName ) {
            var srcInterface = this.getAvailableInterface();
            var dstDevice = _devices[dstName];
            if( !dstDevice ) {
                return false;
            }
            
            var dstInterface = null;
            if( dstInterfaceName ) {
                dstInterface = dstDevice.getInterface( dstInterfaceName );
                if( !dstInterface ) {
                    return false;
                }
            }
            else { 
                dstInterface = dstDevice.getAvailableInterface();
            }
            
            srcInterface.connectTo( dstInterface );
            return true;
        };
    
    SwitchDevice.prototype.destroy = function() {
        
        _.forEach( this._interfaces, function( i ) {
            i.disconnect();
            i.destroy();
        });
    };
    
    function getDeviceByHostName( name ) {
        return _devices[name];
    }
    
    function addDevice( device ) {
        _devices[ device._name ] = device;
    };

    function deleteDevice( device ) {
        var devName;
        if( typeof device == 'string' ) {
            devName = device;
        }
        else {
            devName = device._name;
        }
        
        if( _devices[ devName ] ) { 
            _devices[ devName ].destroy();
            delete _devices[ devName ];
        }
    }
    
    function NetInterface( parent, name ) {
    
        this._host = parent;
        
        var validName = name && name.match( /^(et|fa|gi)[0-9]([/][0-9])+/i );
        if( validName ) {
            // Constructor has been requested to create the specific interface name
            
            this._type = name.substr(0, 2);
            this._name = name;
        }
        else {
            // Just construct a new default interface
            this._type = "fa";
            // Eventually we might want module numbers other than 0, but for now, fake it
            this._name = "fa" + "0/" + parent._interfaces.length;
        }    
        this._hasPhysLink = false;
        this._linkedTo = null;
    }
    
    NetInterface.prototype.connectTo = function( dstInterface ) {
     
        this._linkedTo            = dstInterface;
        dstInterface._linkedTo    = this;
        this._hasPhysLink         = true;
        dstInterface._hasPhysLink = true;
    };
  
    NetInterface.prototype.disconnect = function() {
     
        if( this._linkedTo ) {
            this._linkedTo._linkedTo    = null;
            this._linkedTo._hasPhysLink = false;
        }
        this._linkedTo      = null;
        this._hasPhysLink   = false;
    };
    
    NetInterface.prototype.destroy = function() {
        this.disconnect();
        this._host = null;
    }
  
    function getDeviceNames() {
        var list = [];
        
        for( var device in _devices ) {
        
            if( device != 'length' ) {
                list.push( device );
            }
        }
        return list;
    };
    
    function importModel( modelObject ) {

        // Import pass #1. Create devices and interfaces
        _.forEach( modelObject.devices, function( importDevice ) {
            var conf = { 
                name: importDevice._name,
                MAC:  importDevice._MAC
            }
            
            var newDev = new SwitchDevice( conf );
            addDevice( newDev );
            _.forEach( importDevice._interfaces, function( importInterface ) {
                
                var newInterface = new NetInterface( newDev, importInterface._name );
                
                newDev.addInterface( newInterface );
            });
        });
        
        //Import pass #2. Now that interfaces are created, connect them up
        _.forEach( modelObject.devices, function( importDevice ) {
        
            var srcDev = getDeviceByHostName( importDevice._name );
            _.forEach( importDevice._interfaces, function( importInterface ) {
                if( importInterface._hasPhysLink && importInterface._linkedTo ) {
                    
                    var srcInt = srcDev.getInterface( importInterface._name );
                    
                    var dstArgs = importInterface._linkedTo.split('.');
                    if( dstArgs.length == 2 ) {
                        var dstDevName = dstArgs[1];
                        var dstIntName = dstArgs[0];
                        
                        var dstDev = getDeviceByHostName( dstDevName );
                        var dstInt = dstDev.getInterface( dstIntName );
                        
                        srcInt.connectTo( dstInt );
                    }
                }
            });
        });
        //console.log( _devices );
    }
    
    function exportModel() {
        var model = {};
        
        model.devices = _.cloneDeep( _devices );
        
        // Convert references to symbolic strings to avoid circular data
        _.forEach( model.devices, function( o ) {
            _.forEach( o._interfaces, function( i ) {
            
                if( i._hasPhysLink && i._linkedTo ) {
                    var remoteHost = i._linkedTo._host._name;
                    i._linkedTo = i._linkedTo._name + "." + remoteHost;
                }
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
    
    function reset() {
        _.forEach( _devices, function( d ) {
            d.destroy();
            delete _devices.d;
        });
    }
    
    return {
        // Public Classes
        SwitchDevice:           SwitchDevice,

        // Public Methods
        exportModel:            exportModel,
        importModel:            importModel,
        addDevice:              addDevice,
        deleteDevice:           deleteDevice,
        getDeviceNames:         getDeviceNames,
        getDeviceByHostName:    getDeviceByHostName,
        isValidMAC:             isValidMAC,
        isValidHostName:        isValidHostName,
        reset:                  reset
    };
    
});

