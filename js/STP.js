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


app.constant( 'STP_CONSTANTS', {
                priorities: [ 0, 4096, 8192, 12288, 16384, 20480, 24576, 28672, 32768, 
                              36864, 40960, 45056, 49152, 53248, 57344, 61440 ],
                default_priority: 32768,
                multicast_addr: "0180C2000000",
                SAP: 0x42
                
                });

app.factory( 'STP', function( STP_CONSTANTS, events, ethernet, presenter ) {

    var STP = Class.extend( function() {
    
        this.bridgeID = 0;
        this.rootID = 0;
        this.iAmRoot = false;
        
        this.deviceMACint = 0;
        this.priority = 32768;
        this.sysID = 1;
        this.device;
        
        this.maxAge = 20000;
        this.maxAgeTimer = 0;
        this.helloTime  = 2000;
        this.helloTimer = 0;
        
        function init( iface ) {
            if( !iface.STP ) { 
                iface.STP = { 
                    hello: 0,
                    state: "blk"
                    };
            }        
        }
        
        this.constructor = function( device, priority ) {
        
            this.setPriority( priority );
            this.device = device;
            if( !device ) { 
                throw new Error( "STP: Invalid device." );
            }
            
            this.calcBridgeID();
            this.rootID = this.bridgeID; // We always initially believe we are the root bridge
        }
             
        this.setPriority = function( priority ) {
             if( STP_CONSTANTS.priorities.indexOf( priority ) > -1 ) { 
                this.priority = priority;
            }
        }
        
        this.calcBridgeID = function() {
        
            /* The bridge ID is composed of the priority value ( 4 bits ), system ID ( 12 bits ) 
               and device MAC ( 48 bits ) */
            this.bridgeID = (( this.priority << 12 ) + this.sysID ).toString( 16 ) 
                            + this.device.getMAC();
        }
        
        this.getMACFromBID = function( BID ) {
            return BID.substr( BID.length - 12, 12 );
        }
        
        this.getBridgeID = function() {
            return this.bridgeID;
        }
        
        this.getRootID = function() {
            return this.rootID;
        }
        
        this.isRoot = function() {
            return ( this.bridgeID == this.rootID );
        }
        
        this.getInterfaceState = function( iface, vlan ) {
            init( iface );
            return iface.STP.state;
        }
        
        this.isLearning = function( iface ) {

            init( iface );
            if( iface.STP.state == "lrn" || iface.STP.state == "fwd" ) {
                return true;
            }
            return false;
        }
        
        this.isForwarding = function( iface ) {
            init( iface );
            if( iface.STP.state == "fwd" ) {
                return true;
            }
            return false;
        }
        
        this.isBPDU = function( frame ) {
        
            if( frame.dst == STP_CONSTANTS.multicast_addr ) {
                // Destination is STP multicast address
                if( frame.type_len <= 1500 ) {
                    // EtherType field is actually length, signifying a 802.3 frame
                    if( frame.LLC.DSAP == 0x42 && frame.LLC.SSAP == 0x42 ) {
                        // LLC header specifies this is spanning tree protocol
                        return true;
                    }
                }            
            }
            return false;
        }
        
        this.processBPDU = function( BPDU ) {
        
            if( BPDU.RootID < this.rootID ) {
                // Received a BPDU with a lower root bridge id - we now believe this to be the root 
                
                this.rootID = BPDU.RootID;
            
                var rootMAC = this.getMACFromBID( BPDU.RootID );
                console.log( "Root MAC: " + rootMAC );
                events.post( "STP", "ROOT_CHANGED", { key: this.device.getKey(), MAC: rootMAC } );
                this.device.devConsole.log( "%STP: New root bridge discovered [BID:" + BPDU.RootID + "]" ).endl();
                
                //presenter.deviceThink( this.device, BPDU.RootID + " is the root!" );
            }
        }
        
        this.sendHello = function() {
            var hello = new ethernet.Frame( { src: this.device.getMAC(),
                                              dst: STP_CONSTANTS.multicast_addr,
                                              type_len: 1500,
                                              LLC: {
                                                SSAP: STP_CONSTANTS.SAP,
                                                DSAP: STP_CONSTANTS.SAP,
                                                control: 0
                                                },
                                              payload: {
                                                // BPDU goes here
                                                BridgeID: this.bridgeID,
                                                RootID:   this.rootID
                                                }
                                            });
                                            
            this.device.floodFrame( hello );
        }
        
        this.tick = function( delta ) {
        
            if( this.isRoot() && !this.iAmRoot ) {
                
                events.post( "STP", "BECAME_ROOT", { key: this.device.getKey() } );
                this.device.devConsole.log( "%STP: I am the root bridge." ).endl();
                this.iAmRoot = true;
            }
            
            this.helloTimer += delta;
            if( this.helloTimer >= this.helloTime ) {
                
                if( this.isRoot() ) {
                    this.sendHello();
                }
                this.helloTimer -= this.helloTime;
            }
        

        }
    });
    
    return { 
        STPInstance: STP
    }
})        