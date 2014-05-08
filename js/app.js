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

var app = angular.module('SLApp', ['ui.bootstrap', 'ui.mask', 'workspace_modal']);

app.run( function( main, img, canvas, $http, _import ) 
{
    /* The JSON manifest file tells us what images to load, what diagrams are available, 
     * and other global settings
     */
     var data = {};
     
    $http({method: 'GET', url: './json/manifest.json'})
        .then( function( response ) {
            data = response.data;
            // loadImages returns a promise resolved when all images are loaded.
            return img.loadImages( response.data.images );
            
        }, function( response ) {
            alert("Failed to load manifest, status: " + response.status );
        })
        .then( function( nImages ) { 
            // Images preloaded OK
            console.log( "Loaded " + nImages + " images." );
            
            canvas.init("C");
            main.init();        
        
            _.forEach( data.diagrams, function( d ) {

                if( d.name == "default" ) {
                    _import.fromJSONResource( d.src );
                    return false;
                }
            });
        }, function( err ) {
            alert( "Couldn't load image: " + err );
        });


});

/* Image service
 * Responsible for preloading and managing Image objects */
app.factory( 'img', function( $q )
{
    'use strict';
    var _images = [];
    
    function loadImages( manifest ) {
        var deferred = $q.defer();
        
        var numImages = manifest.length;
        var loadedImages = 0;
        
        for( var i = 0; i < numImages; i++ ) {
            _images[manifest[i].name] = new Image();
            _images[manifest[i].name].onload = function() {
                if( ++loadedImages >= numImages ) {
                    deferred.resolve( numImages );
                }
            };
            _images[manifest[i].name].onerror = function() {
                deferred.reject( manifest[i].name );
            };
            _images[manifest[i].name].src = manifest[i].src;
        }
        return deferred.promise;
    }
    return {
        get:        function get( name ) { return _images[name]; },
        loadImages: loadImages
    }
});

app.factory( 'main', function() 
{
    'use strict'

    var _popups = {
        "switch":   { id: "switchPopup" },
        "link":     { id: "linkPopup" }
    };
    
    var _selectedSwitch = {};

    function init()
    {

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

    function getSelectedSwitch() { return _selectedSwitch; };

    return {
        getSelectedSwitch:  getSelectedSwitch,
        init:               init
    };
});

app.factory( 'state', function() 
{
    'use strict';
    
    /* state name, entry function, exit function */
    var _appStates = {
        "add":  { enter: null, exit: null },
        "edit": { enter: null, exit: null },
        "del":  { enter: null, exit: null },
        "link": { enter: null, exit: null }
    };
    var _appState = "add";

    function set( mode ) {

        _appStates[mode].exit && _appStates[_appState].exit();
        
        if( _appStates[mode] ) {
            _appStates[mode].enter && _appStates[mode].enter();
            _appState = mode;
        }
    };
    
    return {
        get: function() { return _appState; },
        set: set
    };
});

app.factory( '_import', function( canvas, sim, $http ) 
{
    'use strict';
    function fromJSON( jsObj ) {
   
        sim.importModel( jsObj );
        canvas.importView( jsObj );
        canvas.update();
    }
    
    function fromJSONResource( path ) {

        $http({method: 'GET', url: path })
            .success(function(data, status, headers, config) {
                fromJSON( data );
            })
            .error(function(data, status, headers, config) {

            });
    
    }
    return {
        fromJSON:           fromJSON,
        fromJSONResource:   fromJSONResource
    }
});

app.factory( '_export', function( canvas, sim )
{
    'use strict';
    function toJSON() 
    {
        var ModelObject = {};
    
        ModelObject = sim.exportModel();
        _.extend( ModelObject, canvas.exportView() );
        
        var JSONObject = angular.toJson( ModelObject, true );
        return JSONObject;        
    }
    return {
        toJSON: toJSON
    }
});