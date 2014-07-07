app.constant( 'FRAME_TYPES', { 0x0800: "IPv4",
                               0x0806: "ARP",
                               0x86DD: "IPv6" } );

app.factory( 'ethernet', function( mac, FRAME_TYPES, STP_CONSTANTS ) 
{
    
    function Frame( params ) {
        this.dst        = params.dst;
        this.src        = params.src;
        this.type_len   = params.type_len;
        this.LLC        = params.LLC;
        this.SNAP       = null;
        this.payload    = params.payload;
        this.fcs        = true; // Could be set to false to simulate transmission errors
    }
    
    Frame.prototype.type = function() {
    
        if( this.type_len <= 1500 ) {
            // Not EthernetII frame
            
            if( this.dst == STP_CONSTANTS.multicast_addr ) {
                return "STP";
            }
        }
        else {
            // EthernetII frame, look up the EtherType field
            var type = FRAME_TYPES[ this.type_len ];
            return type ? type : "UNIDENTIFIED";
        }
    }
    
    Frame.prototype.setPayload = function( payload, type_len ) {
        this.payload = payload;
        this.type_len = type_len;
    }

    return {
    
        Frame: Frame
    }

});