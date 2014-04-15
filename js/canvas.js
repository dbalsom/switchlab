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

// https://gist.github.com/diverted247/9216242
createjs.Graphics.prototype.dashedLine = function( x1 , y1 , x2 , y2 , dashLen ){
    this.moveTo( x1 , y1 );
 
    var dX = x2 - x1;
    var dY = y2 - y1;
    var dashes = Math.floor(Math.sqrt( dX * dX + dY * dY ) / dashLen );
    var dashX = dX / dashes;
    var dashY = dY / dashes;
 
    var q = 0;
    while( q++ < dashes ){
        x1 += dashX;
        y1 += dashY;
        this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
    }
    this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);
    return this;
}

var SL = (SL || {});

SL.canvas = (function($) {

    var CANVAS_ID = "C";
    var NODE_RADIUS = 40;
    var HIT_DISTANCE = 40;
    
    var pub = {};
    
    var _canvas; 
    var _DC;    
    var _stage = {};
    var _dirty = false;
    var _dirtyLinks = false;

    var _linkCntr = {};    
    var _linkCursor = {};
    var _nodes = {};
    var _nodeCount = 0;
    
    var _selectedNode = {};
    
    var _dragging = false;

    function getAngleFromLine( x1, y1, x2, y2 ) {
        
        return Math.atan2( y2-y1, x2-x1 );        
    }
    
    function getPointOnCircle( cx, cy, a, r ) {
        
        return { x: cx + r * Math.cos( a ), y: cy + r * Math.sin( a ) };
    }
    
    function getDistance( x1, y1, x2, y2 ) {
        return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    }
    
    function hitTestNodes( x, y ) {
        var n;
        var d;
        for( n in _nodes ) {
            
            d = getDistance( x, y, _nodes[n].x, _nodes[n].y );
            if( d < HIT_DISTANCE ) {
                return _nodes[n];
            }
        }
        return null;
    }
    
    function handleTick( evt ) {
        
        if( _dirtyLinks ) {
            updateLinks();
            _dirtyLinks = false;
        }
        if( _dirty ) {
            _stage.update( evt );
            _dirty = false;
        }
    }
    
    function clickBG( evt ) {
        SL.main.handleClick( evt.stageX, evt.stageY );
    }
    
    function updateLinkCursor( on, x1, y1, x2, y2 ) {
    
        _linkCursor.graphics.clear();
    
        if( on ) {
            _linkCursor.graphics.setStrokeStyle(3, "round").beginStroke("green").dashedLine(x1, y1, x2, y2, 5).endStroke();
        }
        _dirty = true;
        //console.log( "x2: "+x2 +" y2: "+y2 ); 
    }
    
    function updateLinks() {

        _linkCntr.removeAllChildren();
       
        if( _nodeCount >= 2 ) {
            for( node in _nodes ) { 
                drawLinksFrom( _nodes[node] );
            }
        }

        _dirty = true;
    }    

    function drawLinksFrom( node ) {
    
        var neighbors = SL.sim.getNeighbors( node.name );
        var linkShape = new createjs.Shape();
    
        for( i = 0; i < neighbors.length; i++ ) {
        
            //console.log( "This would be a line from: " + node.name + " to: " + neighbors[i] );
            linkShape.graphics.moveTo( node.x, node.y ).beginStroke("black").setStrokeStyle(2);
            linkShape.graphics.lineTo( _nodes[neighbors[i]].x, _nodes[neighbors[i]].y).endStroke();
        }
        
        _linkCntr.addChild( linkShape );
    }
    
    pub.Node = function( name, icon, x, y ) {

        // Pull this node into closure scope
        var n = this;
        this.name = name;
        this.icon = icon;
        this.x = x;
        this.y = y;
        
        this.nodeImg = SL.main.getAsset(icon);
        var w = this.nodeImg.width;
        var h = this.nodeImg.height;
        this.nodeBmp = new createjs.Bitmap(this.nodeImg);
        this.nodeBmp;
        this.nodeBmp.name = name; // the bitmap catches the mouseup event
        
        this.nodeTxt = new createjs.Text( name, "12px Arial", "#000" ); 
        this.nodeTxt.textAlign = "center";
        this.nodeTxt.x = this.nodeImg.width / 2;
        this.nodeTxt.y = -NODE_RADIUS;
        
        this.nodeCirc = new createjs.Shape();
        this.nodeCirc.graphics.beginStroke("black").setStrokeStyle(2).beginFill("white");
        this.nodeCirc.graphics.drawCircle( this.nodeImg.width/2, this.nodeImg.height/2,NODE_RADIUS).endFill().endStroke();
        this.nodeCirc.shadow = new createjs.Shadow("rgba(0,0,0,.5)", 3, 3, 15);
        
        this.nodeCntr = new createjs.Container();  
        this.nodeCntr.name = name;
        this.nodeCntr.addChild( this.nodeCirc );
        this.nodeCntr.addChild( this.nodeBmp );
        this.nodeCntr.addChild( this.nodeTxt );

        this.nodeCntr.x = this.x - this.nodeImg.width / 2 + 0.5;
        this.nodeCntr.y = this.y - this.nodeImg.height / 2 + 0.5;        
        
        _dragging = false;

        this.nodeCntr.on( "pressup", function( evt ) {
            if( _dragging ) {
                // We just stopped dragging....
                var appState = SL.main.getMode();
                if(  appState == "link" ) {
                    var endObj = _stage.getObjectUnderPoint( evt.stageX, evt.stageY );
                    if( endObj && endObj.name && endObj.name != name ) {
                        // Don't link a device to itself, that would be silly
                        SL.sim.getDeviceByHostName( name ).connectToHostName( endObj.name );
                        _dirtyLinks = true;
                    }
                }
            }
            updateLinkCursor( false );
            _dragging = false;
        });
        
        this.nodeCntr.on( "mousedown", function( evt ) 
        {
            _dragging = false;
            _selectedNode = this;
           // hidePopups();
        });
        
        this.nodeCntr.on( "pressmove", function( evt ) {
            var dist = getDistance( n.x, n.y, evt.stageX, evt.stageY );
            // Only start dragging a node after the cursor moves a set distance
            // Otherwise intended clicks are often interpreted as tiny drags
            if( dist > 10 ) {
                _dragging = true;
            }
            
            var appState = SL.main.getMode();
            if( _dragging ) {
            
                if( appState == "add" || appState == "edit" ) {
                    n.nodeCntr.x = evt.stageX - w / 2 + 0.5;
                    n.nodeCntr.y = evt.stageY - h / 2 + 0.5;
                    n.x = evt.stageX;
                    n.y = evt.stageY;
                    _dirtyLinks = true; 
                    _dirty = true;
                }
                else if ( appState == "link" ) {
                
                    var hit = hitTestNodes( evt.stageX, evt.stageY );
                    if( hit && hit != n ) {
                        updateLinkCursor( true, n.x, n.y, hit.x, hit.y );
                    } else {
                        updateLinkCursor( true, n.x, n.y, evt.stageX, evt.stageY );
                    }
                    _dirty = true;
                }
            }
        });
        
        this.nodeCntr.on( "click", function( evt ) {
            // We get 'click' events on mouse-up, regardless of dragging status
            if( !_dragging ) {
                // We were not dragging, so this is a legitimate click
                var pt;
                var pt2 = {};
                var offset = $("#"+CANVAS_ID).offset();
                /*
                pt = this.localToGlobal(0, 0);
                pt2.x = pt.x + offset.left + swImg.width + 10;
                pt2.y = pt.y + offset.top - ($("#"+_popups["switch"].id).height()/2 - swImg.height / 2);
                
                _selectedSwitch = newSw;
                
                showPopup( "switch", pt2 );
                */
            }
        });
        

    }
    
    pub.addNode = function( node ) {
        
        if( !node || !node.name || node.name.length < 1 ) {
            return;
        }
        if( _nodes[node.name] ) {
            return;
        }
        
        _nodes[node.name] = node;
        _nodeCount++;
        
        _stage.addChild( node.nodeCntr );
    }   
    
    pub.init = function(id) {
        _canvas = document.getElementById(id);
        _DC = _canvas.getContext("2d"); 

        _stage = new createjs.Stage(_canvas);
        _stage.enableMouseOver();

        // Draw sim background texture
        // This shape also serves as event handler for the sim workspace
        var bg = new createjs.Shape();
        bg.graphics.beginStroke("#000").setStrokeStyle(1).beginBitmapFill(SL.main.getAsset("bg"));
        bg.graphics.drawRect(0,0,_canvas.width-1.5, _canvas.height-1.5).endStroke().endFill();
        bg.on( "click", clickBG );

        _stage.addChild( bg );
     
        // Create container to hold network segment shapes
        _linkCntr = new createjs.Container();  
        _linkCntr.x = 0;
        _linkCntr.y = 0;
        _stage.addChild( _linkCntr );
        
        _linkCursor = new createjs.Shape();
        _stage.addChild( _linkCursor );
        
        createjs.Ticker.addEventListener( "tick", handleTick );

        _stage.update();     
    }
    
    pub.update = function() {
        _stage.update && _stage.update();       
    }

    return pub;

}(jQuery));