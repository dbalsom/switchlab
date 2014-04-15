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

SL.main = (function($) {

    var FONT_SIZE = 12;
    var CANVAS_ID = "C";
    
    var pub = {};
  
    var _imageAssets = [
        {name: "switch", src: "img/switch.png"},
        {name: "bg", src: "img/sim_bg.png"}
    ];
    var _images = [];
    
    var _popups = {
        "switch": { id: "switchPopup" },
        "link": { id: "linkPopup" }
    };

    /* state name, entry function, exit function */
    var _appStates = {
        "add":  { enter: null, exit: null },
        "edit": { enter: null, exit: null },
        "del":  { enter: null, exit: null },
        "link": { enter: null, exit: null }
    };
    var _appState = "add";
    var _selectedSwitch = {};

function loadImages( imageList, callback )
{
    var numImages = imageList.length;
    var loadedImages = 0;
    
    for( var i in imageList) {
        _images[imageList[i].name] = new Image();
        _images[imageList[i].name].onload = function() {
            if( ++loadedImages >= numImages ) {
                callback();
            }
        };
        _images[imageList[i].name].onerror = function() {
            alert("An error occurred preloading images. Try reloading the page.");
        };
        _images[imageList[i].name].src = imageList[i].src;
    }
}

function newSwitch( pt )
{

    var newSw = new SL.sim.dSwitch( name );
    SL.sim.addDevice( newSw );
   
    var node = new SL.canvas.Node( newSw.getHostName(), "switch", pt.x, pt.y );
    SL.canvas.addNode( node );
    
}

function showPopup( popName, pt, speed )
{
    hidePopups();
    try {
        $("#" + _popups[popName].id ).show(speed).offset({ top: pt.y, left: pt.x });
    }
    catch( err ) {}
}

function hidePopups(speed)
{
    var pop;
    for( var i in _popups ) {
        try {
            $("#"+ _popups[i].id).hide(speed);
        }
        catch( err ) {}
    }
}

function init2()
{
    SL.canvas.init(CANVAS_ID);
}

    pub.handleClick = function( cx, cy ) {
            if( $("#"+_popups["switch"].id).is(':visible')) {
                hidePopups();
            }
            else if( _appState == "add" ) {
                newSwitch( {x: cx, y: cy} );
            }
        SL.canvas.update();
    };

    pub.getAsset = function( name ) {
        return _images[name];
    };

    pub.setMode = function( mode ) {
        if( _appStates[mode] ) {
        
            _appStates[mode].enter && _appStates[mode].enter();
            _appState = mode;
        }
    };
    
    pub.getMode = function() {
        return _appState;
    };

    pub.getSelectedSwitch = function() {
        return _selectedSwitch;
    };

    pub.getSwitchList = function() {
        return _switches;
    };

    pub.init = function() {
        loadImages( _imageAssets, init2 );
    };

    return pub;

}(jQuery));


$(document).ready(function()
{
    SL.main.init();
});
    
