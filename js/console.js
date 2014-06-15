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




app.factory( 'DeviceConsole', function( $sanitize )
{
    var DeviceConsole = function( name ) {
        this._buffer  = [];
        this.outputEl = null;
        this.attached = false;
        if( name ) {
            this.name = name;
            this.attachTo( name );
        }
    };
    
    DeviceConsole.prototype.attachTo = function( name ) {
        
        if( !this.attached ) {
            var selector = "#console-" + name;
            
            this.domConsole = $(selector);
            
            if( this.domConsole.length ) {
                this.name = name;
                console.log( "Attached to console: " + this.name );
                this.attached = true;
                
                while( this._buffer.length ) {
                    this.domConsole.append( this._buffer.shift() );
                    this.domConsole.scrollTop( this.domConsole.prop("scrollHeight"));  
                }
            }
        }
    }

    DeviceConsole.prototype.log = function( text, span ) {
        if( !span ) {
            this._out( u.escapeHTML( text ));
        }
        else {
            this._out( "<span class='"+span+"'>"+ u.escapeHTML( text ) + "</span>" );
        }
        return this;
    }
    
    // Append raw html string to console dom element. Do not use directly!    
    DeviceConsole.prototype._out = function( text ) {
        if( !this.attached ) {
            this._buffer.push( text );
        }
        else {
            this.domConsole.append( text );   
            this.domConsole.scrollTop( this.domConsole.prop("scrollHeight")); 
        }
        return this;
    }
    
    DeviceConsole.prototype.endl = function() {
        this.log( "\n" );
    }
    
    return DeviceConsole;
});