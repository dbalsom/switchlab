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
    var INTERFACE_RADIUS = 8;
    var HIT_DISTANCE = 40;
    
    var pub = {};
    
    var _canvas; 
    var _DC;    
    var _stage = {};
    var _dirty = false;
    var _dirtyLinks = false;

    var _linkCntr = {};    
    var _linkCursor = {};
    var _bubbleCntr = {};
    
    var _nodes = {};
    var _nodeCount = 0;
    
    var _selectedNode = {};
    
    var _dragging = false;

    function findAngleFromLine( x1, y1, x2, y2 ) {
        return Math.atan2( y2-y1, x2-x1 );        
    }
    
    function findPointOnCircle( cx, cy, a, r ) {
        return { x: cx + r * Math.cos( a ), y: cy + r * Math.sin( a ) };
    }
    
    function findDistance( x1, y1, x2, y2 ) {
        return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
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
    
    
    function hitTestNodes( x, y ) {
        var n;
        for( n in _nodes ) {
            if( testInCircle( x, y, _nodes[n].x, _nodes[n].y, HIT_DISTANCE )) {
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
        var visitedList = [];
        
        if( _nodeCount >= 2 ) {
            for( node in _nodes ) { 
                drawLinksFrom( _nodes[node], visitedList );
                visitedList[node] = true;
            }
        }

        _dirty = true;
    }    

    function drawLinksFrom( node, visitedList ) {
    
        var neighbors = SL.sim.getNeighbors( node.name );

        var linkShape = new createjs.Shape();
        var srcBubbleShape = node.nodeBubbles;

        var srcAngle;
        var dstAngle;
        var srcPt;
        var dstPt;
        var n_interfaces;
        
        var bubble_angle;
        var bubble_index;
        var angleToNeighbor;
        var bubblePt;
                
        srcBubbleShape.graphics.clear();
        var bubbleList = [];
        var interfaceBubbleList = [];
        var angleStart;
        var angleEnd;
        var bubbleDistance;
        var bubbleBump;
        var collisionAngle;
        var tempBump;
        var collision = false;
        var collideDistance = ((INTERFACE_RADIUS + 2) * 2 );
        
        for( p in neighbors ) {
            //console.log( "This would be a line from: " + node.name + " to: " + p );
            
            interfaceBubbleList.length = 0;
            n_interfaces = neighbors[p].interfaces.length;
            bubble_angle = Math.atan((INTERFACE_RADIUS+1) / ((NODE_RADIUS+1 + INTERFACE_RADIUS+1))) * 2;
            angleToNeighbor = findAngleFromLine( node.x, node.y, _nodes[p].x, _nodes[p].y );
            
            bubble_index = ( n_interfaces - 1 ) / 2.0;
            
            srcAngle = angleToNeighbor - ( bubble_index * bubble_angle );      
            dstAngle = angleToNeighbor + ( bubble_index * bubble_angle ) + Math.PI;     
            
            // Draw bubbles for each interface connected to the current neighbor
            for( i = 0; i < neighbors[p].interfaces.length; i++ ) {
                collision = false;
                srcPt = findPointOnCircle( node.x, node.y, srcAngle, NODE_RADIUS+1 + INTERFACE_RADIUS );

                // Collision check against previously drawn interface bubbles
                var smallestDistance = collideDistance;
                for( j = 0 ; j < bubbleList.length ; j++ ) {
                
                    bubbleDistance = findDistance( srcPt.x, srcPt.y, bubbleList[j].x, bubbleList[j].y );

                    // We want to calculate the 'bump factor' with the closest bubble to avoid overlaps
                    if( bubbleDistance < collideDistance ) {
                        if( bubbleDistance < smallestDistance ) {
                            smallestDistance = bubbleDistance;
                        }
                        collision = true;
                    }
                }

                // Push bubble up to avoid collision
                
                // The math here is probably dumb but I hacked at it until it basically worked.
                var sinTerm = (1 - (smallestDistance / collideDistance)) * (Math.PI/2);
                console.log( "d:" + bubbleDistance + " smallest:" + smallestDistance + " sin:" + sinTerm );
                bubbleBump = NODE_RADIUS + 1 + INTERFACE_RADIUS + ( Math.abs( Math.sin( sinTerm )) * collideDistance );

                srcPt = findPointOnCircle( node.x, node.y, srcAngle, bubbleBump );                
                
                
                dstPt = findPointOnCircle( _nodes[p].x, _nodes[p].y, dstAngle, NODE_RADIUS+1 + INTERFACE_RADIUS );
                
                bubblePt = srcBubbleShape.globalToLocal( srcPt.x, srcPt.y );
                if( collision ) {
                    srcBubbleShape.graphics.beginStroke("black").setStrokeStyle(1).beginFill("red");   
                }
                else {
                    srcBubbleShape.graphics.beginStroke("black").setStrokeStyle(1).beginFill("white");
                }
                srcBubbleShape.graphics.drawCircle( bubblePt.x, bubblePt.y, INTERFACE_RADIUS ).endFill().endStroke();
                
                if( !visitedList[p] ) {
                    // Don't draw segment lines twice
                    linkShape.graphics.moveTo( srcPt.x, srcPt.y ).beginStroke("black").setStrokeStyle(2);
                    linkShape.graphics.lineTo( dstPt.x, dstPt.y).endStroke();
                }
                
                interfaceBubbleList.push( { x: srcPt.x, y: srcPt.y } );
                srcAngle += bubble_angle;
                dstAngle -= bubble_angle;
            }           
            
            bubbleList = bubbleList.concat( interfaceBubbleList );
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
        
        this.nodeBubbles = new createjs.Shape();
        this.bubbleList = [];
        
        this.nodeCntr = new createjs.Container();  
        this.nodeCntr.name = name;
        this.nodeCntr.addChild( this.nodeCirc );
        this.nodeCntr.addChild( this.nodeBubbles );
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
            var dist = findDistance( n.x, n.y, evt.stageX, evt.stageY );
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