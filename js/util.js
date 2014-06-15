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

// Polyfill for Object.create()
if (typeof Object.create != 'function') {
    (function () {
        var F = function () {};
        Object.create = function (o) {
            if (arguments.length > 1) { 
              throw Error('Second argument not supported');
            }
            if (o === null) { 
              throw Error('Cannot set a null [[Prototype]]');
            }
            if (typeof o != 'object') { 
              throw TypeError('Argument must be an object');
            }
            F.prototype = o;
            return new F();
        };
    })();
}

var u = (u || {});

u = (function($) {

    function has( obj, key ) {
        return Object.prototype.hasOwnProperty.call( obj, key );
    }

    var HTML_CHARS = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;'
    };
    
    // Adapted from YUI toolkit
    function escapeHTML( str ) {
        return (str + '').replace( /[&<>"'\/`]/g, function( ch ) { 
            return HTML_CHARS[ch] });
    }
    
    // Craig Buckler http://www.sitepoint.com/javascript-generate-lighter-darker-color/
    function ColorLuminance(hex, lum) {

        // validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        }
        lum = lum || 0;

        // convert to decimal and change luminosity
        var rgb = "#", c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i*2,2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00"+c).substr(c.length);
        }
        return rgb;
    }

    function findAngleFromLine( x1, y1, x2, y2 ) {
        return Math.atan2( y2-y1, x2-x1 );        
    }
    
    function findPointOnCircle( cx, cy, a, r ) {
        return { x: cx + r * Math.cos( a ), y: cy + r * Math.sin( a ) };
    }
    
    function findPointOnLine( x1, y1, x2, y2, n ) {
        d = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
        r = n / d;
        return { x: (r*x2 + (1-r) * x1), y: (r*y2 + (1-r) * y1) };
    }
    
    function findDistance( x1, y1, x2, y2 ) {
        return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    }
    
    function findMidpoint( x1, y1, x2, y2 ) {
        return { x: (x1 + x2)/2, y: (y1 + y2)/2 }
    }
    
    function testInCircle( pt_x, pt_y, cx, cy, r ) {
        var b = ((r*r) > ((cx-pt_x) * (cx-pt_x) + (cy-pt_y) * (cy-pt_y))) ? true:false;
        return b;
    }
    
    function isBetween( value, amin, amax ) {
        var min = amin < amax ? amin : amax;
        var max = amax > amin ? amax : amin;
        
        return ( value >= min && value <= max );
    }    
    
    return {
        has:                has,
        escapeHTML:         escapeHTML,
        ColorLuminance:     ColorLuminance,
        
        findAngleFromLine:  findAngleFromLine,
        findPointOnCircle:  findPointOnCircle,
        findPointOnLine:    findPointOnLine,
        findDistance:       findDistance,
        findMidpoint:       findMidpoint,
        testInCircle:       testInCircle,
        isBetween:          isBetween
    };

}(jQuery));
