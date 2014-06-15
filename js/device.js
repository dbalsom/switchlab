
app.factory( 'Device', function( NetInterface, DeviceConsole ) 
{
    'use strict';

    var _interfaceTypes = {
            et: "Ethernet",
            fa: "FastEthernet",
            gi: "GigabitEthernet",
            lo: "Loopback",
            tu: "Tunnel"
            };    
    
    var Device = Class.extend( function() {
    
        this.maxInterfaces = 0;
        this.interfaces = [];
       
        this.type = "device";
        
        this.constructor = function( conf ) {
        
            this.key  = conf.key;
            this.name = conf.name ? conf.name : "Device";
            this.MAC  = conf.MAC;
            
            this.devConsole = new DeviceConsole( conf.key );
            this.maxInterfaces = conf.maxInterfaces ? conf.maxInterfaces : 0;
        };
        
        this.getKey = function() {
            return this.key;
        };
        
        this.getMAC = function() {
            return this.MAC;            
        };
        
        this.setHostName = function( name ) {
            this.name = name;        
        };
        
        this.getHostName = function() {
            return this.name;
        }; 

        this.toJSON = function() {
            return { 
                name: this.name,
                MAC:    this.MAC,
                maxInterfaces:    this.maxInterfaces,
                interfaces: this.interfaces
            }
        
        };
        
        
        this.getNeighbors = function () {
    
            var neighbors = {};
            var neighborName;
            
            for( var i = 0; i < this.interfaces.length; i++ ) {
                if( this.interfaces[i].hasPhysLink ) {
                    
                    neighborName = this.interfaces[i].remoteHost();

                    if( neighborName ) {
                        if( !neighbors[ neighborName ] ) {
                            neighbors[ neighborName ] = { interfaces: [] };
                        }
                        neighbors[neighborName].interfaces
                            .push({ intName: this.interfaces[i].name,
                                    intIndex: i,
                                    devName: neighborName });
                    }
                }
            }
            return neighbors;
        };
        
        this.addInterface = function( newInterface ) {
            if( this.maxInterfaces == 0 || this.interfaces.length < this.maxInterfaces ) {
            
                if( newInterface ) {
                    newInterface.setHost( this );
                    this.interfaces.push( newInterface );
                    
                    return true;
                }
            }
            else {
                throw "Maximum interface count exceeded for " + this.name;
            }
        };

        this.getAvailableInterface  = function() {
            for( var i = 0; i < this.interfaces.length; i++ ) {
                // Reuse unplugged interfaces
                if( !this.interfaces[i].hasPhysLink ) {
                    return this.interfaces[i];
                }
            }
            // All interfaces plugged in? Create a new one
            if( this.maxInterfaces == 0 || this.interfaces.length < this.maxInterfaces ) {
                //console.log( this.name + " maxinterfaces is" + this.maxInterfaces );
                var newInterface = new NetInterface( this );
                this.interfaces.push( newInterface );
                return newInterface;
            }
            else {
                throw "Maximum interface count exceeded for " + this.name;
            }
        };        

        this.getInterface = function( name ) {
        
            for( var i = 0; i < this.interfaces.length; i++ ) {
                if( this.interfaces[i].name == name ) {
                    return this.interfaces[i];
                }
            }
            return null;
        };

        this.getInterfaces = function() {
            return this.interfaces;
        };
        
        this.connectTo = function( dstDevice, dstInterfaceName ) {

            if( !dstDevice ) {
                return false;
            }
            
            var srcInterface = this.getAvailableInterface();            
            var dstInterface = null;
            if( dstInterfaceName ) {
                dstInterface = dstDevice.getInterface( dstInterfaceName );
                if( !dstInterface ) {
                    throw "connectTo: Specified interface could not be found."
                    return false;
                }
            }
            else { 
                dstInterface = dstDevice.getAvailableInterface();
            }
            
            //this.devConsole.log( "Connected to: <b>" + dstDevice.name + "</b>" ).endl();
            this.devConsole.log( "Connected to: "  ).log( dstDevice.name, "red underline" ).endl();
            srcInterface.connectTo( dstInterface );
            return true;
        };
       
        this.destroy = function() {
            for( var i = 0 ; i < this.interfaces.length; i++ ) {
                this.interfaces[i].destroy();
                delete this.interfaces[i];
            }
        };

    });

    return Device;

    
});
        

app.factory( 'SwitchDevice', function( Device ) 
{

    var SwitchDevice = Device.extend( function() {

        this.constructor = function(conf) {
            this.super(conf); // Call base class constructor
            this.type = "switch";

            this.devConsole.log( "Booting up...").endl();
        }
    });
    
    return SwitchDevice;
})

app.factory( 'HostDevice', function( Device ) 
{

    var HostDevice = Device.extend( function() {
    
        this.constructor = function(conf) {
            this.super(conf); // Call base class constructor+
            this.type = "host";
            this.maxInterfaces = 1;
        }
    });
    
    return HostDevice;
})

app.factory( 'NetInterface', function() 
{
    'use strict';

    function NetInterface( host, name ) {
    
        this._host = host;
        
        var validName = name && name.match( /^(et|fa|gi)[0-9]([/][0-9])+/i );
        if( validName ) {
            // Constructor has been requested to create the specific interface name
            
            this.type = name.substr(0, 2);
            this.name = name;
        }
        else {
            // Just construct a new default interface
            this.type = "fa";
            // Eventually we might want module numbers other than 0, but for now, fake it
            this.name = "fa" + "0/" + host.getInterfaces().length;
        }    

        this._linkedTo = null;

        this.hasPhysLink = false;
        this.vlan      = 1;
    }
    
    NetInterface.prototype.setHost = function( host ) {
        
        this._host = host;    
    }
    
    NetInterface.prototype.connectTo = function( dstInterface ) {
     
        this._linkedTo            = dstInterface;
        dstInterface._linkedTo    = this;
        this.hasPhysLink         = true;
        dstInterface.hasPhysLink = true;
    };
  
    NetInterface.prototype.remoteHost = function() {

        if( this._linkedTo ) {
            if( this._linkedTo._host ) {
                return this._linkedTo._host.key;
            }
        }
        else {
            return null;
        }
    };
  
    NetInterface.prototype.disconnect = function() {
     
        if( this._linkedTo ) {
            this._linkedTo._linkedTo    = null;
            this._linkedTo.hasPhysLink = false;
        }
        this._linkedTo     = null;
        this.hasPhysLink   = false;
    };
    
    NetInterface.prototype.destroy = function() {
        this.disconnect();
        this._host = null;
    }
    
    NetInterface.prototype.fromJSON = function( obj ) {
    
        var props = [{in:"name", out:"name"}, 
                     {in:"type", out:"type"},
                     {in:"vlan", out:"vlan"},
                     {in:"hasPhysLink", out:"hasPhysLink"},
                     {in:"linkedTo", out:"_linkedToStr"} ];
        
        for( var i = 0; i < props.length; i++ ) {
        
            if( typeof obj[props[i].in] !== "undefined" ) {
                this[ props[i].out ] = obj[props[i].in];
            }
        }
    }
    
    NetInterface.prototype.toJSON = function() {
        
        var jsonLink;
        if( this.hasPhysLink && this._linkedTo ) {
            jsonLink = this._linkedTo.name + "." + this.remoteHost();
        }
        else {
            jsonLink = null;
        }
        
        return { 
            name:           this.name,
            type:           this.type,
            vlan:           this._vlan,
            hasPhysLink:    this.hasPhysLink,
            linkedTo:       jsonLink
        }
    }
    /*
    NetInterface.prototype.stringify = function() {
        if( this.hasPhysLink && typeof this._linkedTo === "object" ) {
            this._linkedTo = this._linkedTo.name + "." + this.remoteHost();
        }
        if( typeof this._host === "object" ) {
            this._host = this._host.name;
        }        
    }
    
    NetInterface.prototype.unStringify = function( nameResolver ) {
        
        if( this._linkedToStr ) {
            var dstArgs = this._linkedToStr.split('.');
            if( dstArgs.length == 2 ) {
                var dstIntName = dstArgs[0];
                var dstDevName = dstArgs[1];
                var dstDev = nameResolver( dstDevName );
                var dstInt = dstDev.getInterface( dstIntName );
                
                this.connectTo( dstInt );
            }
            else {
                throw "NetInterface.unStringify(): Invalid link reference.";
            }
        }
    }*/
    
    return NetInterface;
    
});     