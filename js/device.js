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

app.factory( 'DeviceDefs', function() 
{
    return {
        
        STP_ROOTBRIDGE: 0x01    
    }
});


app.factory( 'Device', function( mac, NetInterface, DeviceConsole ) 
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
        this.cmds = {};
       
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
        
        this.getStatus = function() {
            return 0;
        };

        this.toJSON = function() {
            return { 
                name: this.name,
                type: this.type,
                MAC:  this.MAC,
                maxInterfaces:    this.maxInterfaces,
                interfaces: this.interfaces
            }
        
        };
        
        this.getInterfaceState = function( interfaceName ) {
            // The generic device always forwards frames
            return "fwd";
        }
        
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
       
        this.tick = function( delta ) {
        
        };
        
        this.exec = function( input ) {
        
            if( typeof input !== "string" ) {
                this.devConsole.log( "Invalid input." );
                return;
            }
            var execStr = input.match(/(?:[^\s"]+|"[^"]*")+/g);
            var args = execStr.slice(1);
                
            if( !execStr.length ) {
                return;
            }
            
            this.devConsole.log( ">" + input, "gray" ).endl();
            
            if( execStr[0] == "?" || execStr[0] == "help" ) {
                this.devConsole.log( "Available commands: ").endl();
                for( var cmd in this.cmds ) {
                    this.devConsole.log( cmd ).endl();
                }
                return;
            }
            
            if( this.cmds[execStr[0]] ) {
                this.cmds[execStr[0]].apply( this, args );
            }
            else {
                this.devConsole.log( "Command not found." ).endl();
            }
        }
       
        this.destroy = function() {
            for( var i = 0 ; i < this.interfaces.length; i++ ) {
                this.interfaces[i].destroy();
                delete this.interfaces[i];
            }
        };

    });

    return Device;
    
});
        

        
app.factory( 'SwitchDevice', function( Device, DeviceDefs, STP, presenter ) 
{

    var SwitchDevice = Device.extend( function() {
    
        this.MACTable = [];
        this.MACTableArray = [];
        this.notifyDeviceUpdate = _.debounce( presenter.notifyDeviceUpdate, 500 );
        
        this.constructor = function(conf) {
            this.super(conf); // Call base class constructor
            this.type = "switch";
            switch( conf.STPmode ) {
                
                default: 
                    this.STP = new STP.STPInstance( this );
                break;
            }
            this.devConsole.log( "Booting up...").endl();
        }
        
        this.getMACTable = function() {

            var MACTableArray = [];
            
            for( mac in this.MACTable ) {
                
                MACTableArray.push( this.MACTable[mac] );
            }
            return MACTableArray;
        }
        
        this.getStatus = function() {
            return this.STP.isRoot();
        };
        
        this.tick = function( delta ) {
        
            this.STP.tick( delta );
            var frameCount = 0;
            var ifaceCount = 0;
            
            _.forEach( this.interfaces, function( iface ) {
                
                ifaceCount++;
                var frame = iface.pop();
                if( !frame ) { 
                    return true;
                }
                frameCount++;

                if( this.STP.isBPDU( frame ) ) {
                    this.STP.processBPDU( frame.payload );
                }
                
                if( this.STP.isLearning( iface )) {
                
                    // Add the incoming frame's source MAC to the address table
                    this.MACTable[frame.src] = {
                            MAC: frame.src,
                            vlan: 1,
                            ifaceName: iface.name,
                            iface: iface,
                            age: 0 };
                            
                    // Present the update to the UI
                    presenter.notifyDeviceUpdate( this, "MAC Address Table" );
                }

                if( this.STP.isForwarding( iface )) {
                    // Now look up the destination
                    var macEntry = this.MACTable[frame.dst];
                    if( macEntry && macEntry.iface ) {
                        
                        // We have an entry in the MAC table. Send the frame out this interface
                        macEntry.iface.send( frame );
                    }                
                    else {
                        // No entry in MAC table, flood the frame out all interfaces
                        this.floodFrame( frame, iface );
                    }
                }
                else {
                    
                    if( !this.STP.isBPDU( frame ) ) {
                        presenter.requestDropPresentation( this, iface, frame.type() );
                    }
                }
            }, this );       

            if( frameCount ) {
                //this.devConsole.log( "Processed : " + frameCount + " frames from " + ifaceCount + " interfaces." ).endl()
            }
        }

        // Send frame out all interfaces except the source interface.        
        this.floodFrame = function( frame, srcInterface ) {
        
            _.forEach( this.interfaces, function( iface ) {
                if( iface != srcInterface ) {
                    iface.send( frame );               
                }
            }, this );
        }
        
        this.getInterfaceState = function( interfaceName ) {
            var iface = this.getInterface( interfaceName );

            return this.STP.getInterfaceState( iface, 1 );
            
        }        
        
    });
    
    return SwitchDevice;
})

app.factory( 'HostDevice', function( Device, mac, ethernet, presenter ) 
{

    var HostDevice = Device.extend( function() {
    
        this.constructor = function(conf) {
            this.super(conf); // Call base class constructor+
            this.type = "host";
            this.maxInterfaces = 1;
            this.cmds["sendframe"] = this.cmd_Sendframe;
        }
        
        this.cmd_Sendframe = function() {
            
            if( arguments.length < 1 ) {
                this.devConsole.log( "sendframe [destination MAC]" ).endl();
            }
            if( arguments.length > 0 ) {
                if( !mac.isValid( arguments[0] )) {
                    this.devConsole.log( "Invalid destination MAC specified." ).endl();
                    return false;
                }
            }
            
            var frame = new ethernet.Frame( { dst: arguments[0], payload: "Hello World!" } );
            this.interfaces[0].send( frame );
            return true;
        }
        
        this.tick = function( delta ) {
            
            _.forEach( this.interfaces, function( iface ) {
                
                var frame = iface.pop();
                if( !frame ) { 
                    return true;
                }
                
                // We don't do anything with any frames at the moment. DROP ALL THE THINGS
                presenter.requestDropPresentation( this, iface, frame.type() ); 
            }, this );
        }
        
    });
    
    return HostDevice;
})

app.factory( 'NetInterface', function( LinkedList, presenter ) 
{
    'use strict';

    function NetInterface( host, name ) {
    
        this._host = host;
        this._rxBuffer = new LinkedList();
        
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
     
        this._linkedTo           = dstInterface;
        dstInterface._linkedTo   = this;
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
  
    NetInterface.prototype.send = function( frame ) {
        
        if( !this._linkedTo ) {
            return;
        }
        
        frame.src = frame.src ? frame.src : this._host.getMAC();
        
        //this._linkedTo._rxBuffer.queue( frame );
        var dstInt = this._linkedTo;
        
        frame.received = false;
        
        presenter.requestFramePresentation( this._host, this, frame.type(),
            function() {
                frame.received = true;
                dstInt.receive( frame ) 
                //console.log( "Frame received!" );
            });
    }
  
    NetInterface.prototype.receive = function( frame ) {

        this._rxBuffer.queue( frame );
    }
  
    NetInterface.prototype.pop = function() {
        return this._rxBuffer.pop();
    }
  
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

    return NetInterface;
    
});     