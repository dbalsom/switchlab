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
    var dashes = Math.floor( Math.sqrt( dX * dX + dY * dY ) / dashLen );
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


// Mouse state class, giving a persistent state from mouse events.
app.factory( 'mouse', function() {

    var _startPt = { x: 0, y: 0 };
    var _curPt = { x: 0, y: 0 };
    var _isDragging = false;
    var _isDown = false;
    
    function getStartPt() { return _startPt; }
        
    function up() { _isDown = false; _isDragging = false; }
    function down( x, y ) {
        _startPt.x = x;
        _startPt.y = y;
        _isDown = true;
    }
    
    function move( x, y ) {
        _curPt.x = x, _curPt.y = y;
        
        if( !u.testInCircle( x, y, _startPt.x, _startPt.y, 10 ) ) {
            _isDragging = true;
            
        }
    }

    function isDragging() { return _isDragging; }

    return {
        getStartPt: getStartPt,
        up:         up,
        down:       down,
        move:       move,
        isDragging: isDragging
    };
});

app.constant( 'PROTOCOL_COLORS', { "STP": "FFA500",
                                   "ARP": "DB7093" } );

app.factory( 'canvas', function( state, img, sim, mouse, ui, uiInfoPanels, notify, LinkedList,
                                 PROTOCOL_COLORS ) {

    'use strict';
    var CANVAS_ID = "C";
    var NODE_RADIUS = 40;
    var INTERFACE_RADIUS = 7;
    var HIT_DISTANCE = 40;
    var SLOW_TICK_RATE = 1000;
    var _slowTicker = 0;
    
    var _canvas; 
    var _DC;    
    var _stage = {};
    var _dirty = false;
    var _dirtyLinks = false;
    var _dirtyUI = false;

    var _mainLinkCntr = {};    
    var _packetCntr = {};
    var _linkCursor = {};
    var _bubbleCntr = {};
    var _fpsTxt;
    
    var _nodes = {};
    var _links = {};
    var _nodeCount = 0;

    var _packetList;
    var _animating = false;
    
    var _selectedNode;
    
    var _dragging = false;
    var _frameCount = 0;
    var _fps = 0;
    
    function pTween( shape, callback ) {
        this.shape    = shape;
        this.callback = callback;
    }

    function hitTestNodes( x, y ) {
        for( var n in _nodes ) {
            if( u.testInCircle( x, y, _nodes[n].x, _nodes[n].y, HIT_DISTANCE )) {
                return _nodes[n];
            }
        }
        return null;
    }
    
    function handleTick( evt ) {
        
        // Typically we only update the stage on a tick if something is marked dirty, or if there
        // are active tweens animating.
        // But we also update every so often, at the 'slow tick' rate. This allows us to omit
        // any sort of event or signal from the ui to tell the canvas to update - it will get
        // around to it eventually.
        _slowTicker += evt.delta;
        if( _slowTicker >= SLOW_TICK_RATE ) {
            _slowTicker -= SLOW_TICK_RATE;
            
            _.forEach( _nodes, function( node ) {
                node.update();
            });
            ui.updateClock();
            _dirty = true;
            
            _fps = _frameCount / (SLOW_TICK_RATE / 1000);
            _fpsTxt.text = _fps;
            _frameCount = 0;
            
            //console.log("tock... " + _slowTicker );
        }
        
        sim.tick( evt.delta );
    
        if( _dirtyUI ) {
            ui.updateTabs();
            ui.updatePanels();
            _dirtyUI = false;
        }
        
        if( _dirtyLinks ) {
            drawLinks();
            _dirtyLinks = false;
        }
        
        if( _dirty || _animating ) {
            _frameCount++;
            _stage.update( evt );
            _dirty = false;
        }  
    }
    
    function handleBGClick( evt ) {
        /*
        if( $("#"+_popups["switch"].id).is(':visible')) {
            hidePopups();
        }
        else*/
        if( ui.getEditorMode() == "add" ) {
            newDevice( { x: evt.stageX, y: evt.stageY } );
        }
    }
    
    function newDevice( pt )
    {
        var type = ui.getEditorAddType();
        
        var newDevice = sim.createDevice( type );
                
        if( sim.addDevice( newDevice ) ) {
       
            var newNode = new Node( newDevice.getKey(), newDevice.getHostName(), type, pt.x, pt.y );
            
            addNode( newNode );
            selectNode( newNode );
            
            ui.updateTabs();
            update();
        }
        else {
        
            notify.write( "Device creation failed: " + type );
        }
    }; 
    
    function updateLinkCursor( on, x1, y1, x2, y2 ) {
    
        _linkCursor.graphics.clear();
        if( on ) {
            _linkCursor.graphics.setStrokeStyle(3, "round").beginStroke("green");
            _linkCursor.graphics.dashedLine(x1, y1, x2, y2, 5).endStroke();
        }
        _dirty = true;
    }
        
    function hashLink( srcDev, srcInt, dstDev, dstInt )
    {
        var dev1, int1, dev2, int2;
        
        if( srcDev < dstDev ) {
            dev1 = srcDev;
            int1 = srcInt;
            dev2 = dstDev;
            int2 = dstInt;
        }
        else {
            dev1 = dstDev;
            int1 = dstInt;
            dev2 = srcDev;
            int2 = srcInt;
        }
        return dev1 + "." + int1 + ":" + dev2 + "." + int2;
    }
        
    function updateNeighbors() {
        
        for( var nodeKey in _nodes ) {
            var node      = _nodes[nodeKey];
            
            if( node ) { 
                node.updateNeighbors();
            }
        }
    }
        
    function drawLinks() {

        _mainLinkCntr.removeAllChildren();
        var visitedList = [];
        
        if( _nodeCount >= 2 ) {
            for( var nodeKey in _nodes ) { 
            
                drawLinksFrom( _nodes[nodeKey], visitedList );
                visitedList[nodeKey] = true;
            }
        }
    }    

    function testDrop( node ) {
        if( node ) {
            var device = sim.getDeviceByKey( node.key );
            if( device ) {
                dropPacket( _selectedNode );
            }
        }    
    }
    
    function testPackets( node ) {
        if( node ) {
            var device = sim.getDeviceByKey( node.key );
            if( device ) {
                var neighbors = device.getNeighbors();
            }
            for( var p in neighbors ) {
                for( var iface in neighbors[p].interfaces ) {
                
                    //console.log( "Sending packet from interface " + neighbors[p].interfaces[iface].intName );
                    sendPacket( _selectedNode, neighbors[p].interfaces[iface].intName );
                }
            }
            device.devConsole.log( "Sending testing packets...").endl();
        }
    }

    function selectNode( node ) {
    
        // Reset color for previously selected node
        if( _selectedNode ) {
            _selectedNode.setBandColor( "white", "white" );
        }
        // Change selection...
        _selectedNode = node;

        uiInfoPanels.reset();
        if( _selectedNode ) {
            // Now change color for newly selected node
            _selectedNode.setBandColor( "DarkSalmon", "white" );
            
            ui.selectDevice( _selectedNode.key );
        }

        ui.updatePanels();
        _dirty = true;    
    }

    function sendPacket( srcNode, srcInt, frameType, callback ) {

        var srcBubble = _.find( srcNode.bubbleList, 
            function( bubble ) { 
                return bubble.intName == srcInt; 
            });
        
        if( !srcBubble ) {
            return false;
        }
                
        var packetShape = new createjs.Shape();
        var packetTween = new pTween( packetShape, callback );
        
        var packetColor = PROTOCOL_COLORS[ frameType ];
        packetColor = packetColor ? packetColor : "White";
        
        packetShape.graphics.setStrokeStyle(1)
                            .beginStroke("black")
                            .beginFill( packetColor )
                            .moveTo( -13, 0 )
                            .bezierCurveTo( -.3,  8, .3, 8,   13, 0 )
                            .bezierCurveTo( .3,  -8, -.3, -8,  -13, 0 )
                            .endFill()
                            .endStroke();

        // We overshoot the interface bubbles just a bit so frames aren't sticking 
        // out when they stop travelling
        packetShape.x = -6;
        packetShape.y = 0;

        /*
        var midpoint = u.findMidpoint( srcBubble.x, srcBubble.y, srcBubble.dstX, srcBubble.dstY );

        createjs.Tween.get( packetShape )
              .to( { x: midpoint.x, y: midpoint.y, scaleX:1.5 }, 500, createjs.Ease.getPowIn(2.5) )
              .to( { x: srcBubble.dstX, y: srcBubble.dstY, scaleX:1}, 500, createjs.Ease.getPowOut(2.5) )
              .call( function() { 
                        
                        srcBubble.linkCntr.removeChild( packetShape );
                        _packetList.remove( packetShape );
                        
                        //deletePacket( packetShape )
                     });
        */
        
        srcBubble.linkCntr.addChild( packetShape );
        packetShape.scaleX = 1 / srcBubble.linkCntr.scaleX;
        
        createjs.Tween.get( packetShape )
                      .to( { x: 106, y: 0 }, 1000, createjs.Ease.getPowInOut(2.5) )
                      .call( function() { 
                      
                            if( packetTween.callback ) { 
                                packetTween.callback();
                            }
                            
                            srcBubble.linkCntr.removeChild( packetShape );
                            _packetList.remove( packetTween );
                            if( _packetList.isEmpty() ) {
                                //console.log( "Stopping animation.");
                                _animating = false;
                            }

                      });
        
        _packetList.push( packetTween );
        
        _animating = true;
    }

    function dropPacket( srcNode, srcInt, frameType ) {
        
        var packetShape = new createjs.Shape();
        var packetTween = new pTween( packetShape );
        
        var packetColor = PROTOCOL_COLORS[ frameType ];
        packetColor = packetColor ? packetColor : "White";
        
        packetShape.graphics.setStrokeStyle(1)
                            .beginStroke("black")
                            .beginFill( packetColor )
                            .drawCircle(0,0,7)
                            .endFill()
                            .endStroke();
                            
        packetShape.x = srcNode.x;
        packetShape.y = srcNode.y;
    
        _packetCntr.addChild( packetShape );

        // We create the parabolic tween by combining two separate tweens, one on the Y axis
        // with a getBackIn ease to simulate gravity, and one on the X axis to deflect the packet's
        // fall a random displacement. It's not mathematically accurate, but it looks good enough.
        createjs.Tween.get( packetShape )
                      .to( { y: srcNode.y + _canvas.height },
                             1000, 
                             createjs.Ease.getBackIn(2 + Math.random() * .75) )
                      .call( function() { 
                            _packetCntr.removeChild( packetShape );
                            _packetList.remove( packetTween );
                            if( _packetList.isEmpty() ) {
                                _animating = false;
                            }
                      });      

        createjs.Tween.get( packetShape ).to( { x: srcNode.x + (Math.random() - .5) * 200,
                                                alpha: 0 },
                                                1000,
                                                createjs.Ease.getPowIn(2) );
                      
        _packetList.push( packetTween );
        _animating = true;                      
    }
    
    function deletePacket( packetShape ) {
        // Need to redo this for tweenjs 
    }
    
    function getNodeByKey( key ) {
        return _nodes[key];
    }
    
    function drawLinksFrom( node, visitedList ) {
            
        var linkShape = new createjs.Shape();
        var srcBubbleShape = node.nodeBubbles;

        var srcPt;
        var dstPt;
        
        var nInterfaces;

        var neighborBubbleList = [];
        var angleStart;
        var angleEnd;

        var collisionAngle;
        var collision = false;
        var collideDistance = ((INTERFACE_RADIUS + 2) * 2 );
        
        srcBubbleShape.graphics.clear();
        node.bubbleList.length = 0;
        
        var device = sim.getDeviceByKey( node.key );
        if( !device ) {
            // Not necessarily an error, if we want nodes with no associated devices?
            return false;
        }
        
        if( !node._neighbors ) {
            node.updateNeighbors();
        }
        
        for( var n in node._neighbors ) {
            
            neighborBubbleList.length = 0;
            nInterfaces = node._neighbors[n].interfaces.length;
            
            // bubbleSector is the angle between interface bubbles. We pad values by 1 to account
            // for the stroke weight (maybe should make this variable?)
            var bubbleSector = Math.atan((INTERFACE_RADIUS+1) / 
                                ((NODE_RADIUS+1 + INTERFACE_RADIUS+1))) * 2;
            var angleToNeighbor = u.findAngleFromLine( node.x, node.y, _nodes[n].x, _nodes[n].y );
            
            // We center the bubbles across an arc facing the current neighbor. 
            // We start at one end of the arc and draw bubbles at each sector 'slice', incrementing
            // the angle by 'bubbleSector' for each interface.
            // Conveniently, the angles can simply be mirrored at the destination device, so we
            // can easily draw a line to where the destination bubble will be.
            var bubbleIndex = ( nInterfaces - 1 ) / 2.0;
            var srcAngle = angleToNeighbor - ( bubbleIndex * bubbleSector );      
            var dstAngle = angleToNeighbor + ( bubbleIndex * bubbleSector ) + Math.PI;     
            
            // Draw bubbles for each interface connected to the current neighbor
            for( var i = 0; i < nInterfaces; i++ ) {
                collision = false;
                srcPt = u.findPointOnCircle(    node.x, node.y, 
                                                srcAngle, 
                                                NODE_RADIUS+1 + INTERFACE_RADIUS );

                dstPt = u.findPointOnCircle(    _nodes[n].x, _nodes[n].y, 
                                                dstAngle,
                                                NODE_RADIUS+1 + INTERFACE_RADIUS );                                                
                                                
                // Collision check against previously drawn interface bubbles
                var bubbleDistance;
                var bubbleBump;
                var smallestDistance = collideDistance;
                for( var j = 0 ; j < node.bubbleList.length ; j++ ) {
                
                    bubbleDistance = u.findDistance(    srcPt.x, srcPt.y,
                                                        node.bubbleList[j].x,
                                                        node.bubbleList[j].y );

                    // We want to calculate the 'bump factor' against the closest bubble to 
                    // avoid overlaps
                    if( bubbleDistance < collideDistance ) {
                        if( bubbleDistance < smallestDistance ) {
                            smallestDistance = bubbleDistance;
                        }
                        collision = true;
                    }
                }

                // If bubbles collided, push current bubble outwards to avoid collision
                if( collision ) {
                    var sinTerm = (1 - (smallestDistance / collideDistance)) * (Math.PI/2);
                    var bubbleBump = ( Math.abs( Math.sin( sinTerm )) * collideDistance );
                    /*
                    srcPt = u.findPointOnCircle(    node.x, node.y, 
                                                    srcAngle, 
                                                    NODE_RADIUS+1 + INTERFACE_RADIUS + bubbleBump );                      
                    */
                    srcPt = u.findPointOnLine( srcPt.x, srcPt.y, dstPt.x, dstPt.y, bubbleBump );
                }
              
                var srcPtLocal = srcBubbleShape.globalToLocal( srcPt.x, srcPt.y );
                var dstPtLocal = srcBubbleShape.globalToLocal( dstPt.x, dstPt.y );

                var iface = node._neighbors[n].interfaces[i];
                iface.linkCntr.x = srcPt.x;
                iface.linkCntr.y = srcPt.y;
                iface.linkCntr.rotation = angleToNeighbor * 57.2957795131;                
                
                var state = device.getInterfaceState( iface.intName );
                if( state == undefined ) {
                    console.log( "Couldn't get state for: " + iface.intName );
                }
                var bubbleColor = "white";
                switch( state ) {
                    
                    case "blk": 

                        bubbleColor = "CC0000";
                        break;

                }
                
                srcBubbleShape.graphics
                    .beginStroke("black").setStrokeStyle(1).beginFill(bubbleColor)
                    .drawCircle( srcPtLocal.x, srcPtLocal.y, INTERFACE_RADIUS )
                    .endFill()
                    .endStroke();
                
                // Draw the network segment line only if this node hasn't been visited yet
                if( !visitedList[n] ) {
                    linkShape.graphics
                        .beginStroke("black")
                        .setStrokeStyle(2)
                        .moveTo( srcPt.x, srcPt.y )
                        .lineTo( dstPt.x, dstPt.y)
                        .endStroke();
                }
                
                var distanceToNode = u.findDistance( node.x, node.y, _nodes[n].x, _nodes[n].y );
                var distanceToNeighbor = u.findDistance( srcPt.x, srcPt.y, dstPt.x, dstPt.y );

                
                if( distanceToNode < NODE_RADIUS * 2 ) {
                    // Nodes are overlapping. Just scale everything to 0 so we don't get weird
                    // effects like packets flying out into space behind the node.
                    iface.linkCntr.scaleX = 0;
                }
                else {
                    iface.linkCntr.scaleX = distanceToNeighbor / 100;
                    for( var c = 0; c < iface.linkCntr.children.length; c++ ) {
                        iface.linkCntr.children[c].scaleX = 1 / iface.linkCntr.scaleX;
                    }                
                }
                
                neighborBubbleList.push({   x: srcPt.x, 
                                            y: srcPt.y, 
                                            dstX: dstPt.x,
                                            dstY: dstPt.y,
                                            angle: angleToNeighbor,
                                            linkCntr: iface.linkCntr,
                                            intName: iface.intName });
                
                // Adjust the angle for the next interface bubble. Mirrored for the destination
                // interface.
                srcAngle += bubbleSector;
                dstAngle -= bubbleSector;
            }           
            node.bubbleList = node.bubbleList.concat( neighborBubbleList );
        }
        _mainLinkCntr.addChild( linkShape );
    }
    
    function Node( key, name, icon, x, y ) {

        var n = this; // Pull this node into closure scope for container events (fixme?)
        this.name = name;
        this.icon = icon;
        this.x = x;
        this.y = y;
        
        this._neighbors;
        this._linkContainers = [];
        this.key = key;
        
        this.nodeImg = img.get(icon);
        var w = this.nodeImg.width;
        var h = this.nodeImg.height;
        this.nodeBmp = new createjs.Bitmap(this.nodeImg);
        this.nodeBmp;

        this.nodeTxtOut = new createjs.Text( name, "bold 12px Arial", "#FFF" );
        this.nodeTxtOut.textAlign = "center";
        this.nodeTxtOut.x = this.nodeImg.width / 2;
        this.nodeTxtOut.y = -NODE_RADIUS;
        this.nodeTxtOut.outline = 2;
        
        this.nodeTxt = new createjs.Text( name, "bold 12px Arial", "#000" ); 
        this.nodeTxt.textAlign = "center";
        this.nodeTxt.x = this.nodeImg.width / 2;
        this.nodeTxt.y = -NODE_RADIUS;
        
        this.nodeCirc = new createjs.Shape();
        this.nodeCirc.graphics.beginStroke("black").setStrokeStyle(2).beginFill("white");
        this.nodeCirc.graphics.drawCircle(  this.nodeImg.width/2, 
                                            this.nodeImg.height/2, 
                                            NODE_RADIUS).endFill().endStroke();
        this.nodeCirc.shadow = new createjs.Shadow("rgba(0,0,0,.5)", 3, 3, 15);
        
        this.nodeBand = new createjs.Shape();
        this.nodeBand.graphics.beginStroke("white").setStrokeStyle(4);
        this.nodeBand.graphics.drawCircle(  this.nodeImg.width/2, 
                                            this.nodeImg.height/2, 
                                            NODE_RADIUS - 3).endFill().endStroke();       
                                            
        this.nodeBubbles = new createjs.Shape();
        this.bubbleList = [];
        
        this.nodeCntr = new createjs.Container();  
        this.nodeCntr.name = name;
        this.nodeCntr.addChild( this.nodeCirc, this.nodeBand, this.nodeBubbles, this.nodeBmp,
                                this.nodeTxtOut, this.nodeTxt );
        
        this.nodeCntr.x = this.x - this.nodeImg.width / 2 + 0.5;
        this.nodeCntr.y = this.y - this.nodeImg.height / 2 + 0.5;        
        
        this.nodeCntr.on( "pressup", function( evt ) {
            if( mouse.isDragging() ) {
                
                if( ui.getEditorMode() == "link" ) {
                    // We just stopped dragging in link mode, so check if we stopped at another 
                    // node. But don't link a node to itself, that would be silly.
                    
                    // The 'pressup' event is tied to the node that we started dragging on, so 
                    // we need to do our own hit-testing.
                    var endNode = hitTestNodes( evt.stageX, evt.stageY );
                    
                    if( endNode && endNode.key && endNode.key != key ) {
                        
                        var dstDev = sim.getDeviceByKey( endNode.key );
                        
                        try {
                            sim.getDeviceByKey( key ).connectTo( dstDev );
                            // Important to update neighbors for both source and destination node
                            n.updateNeighbors();
                            endNode.updateNeighbors();
                        }
                        catch( err ) {
                            notify.write( err );
                        }
                        _dirtyLinks = true;
                        _dirtyUI = true;
                    }
                }
            }
            updateLinkCursor( false );
            mouse.up();
        });
        
        this.nodeCntr.on( "mousedown", function( evt ) 
        {
            mouse.down( evt.stageX, evt.stageY );
            
            if( n != _selectedNode ) {
                selectNode( n );
            }

           // hidePopups();
        });
        
        this.nodeCntr.on( "pressmove", function( evt ) {
            // Only start dragging a node after the cursor moves a set distance
            // Otherwise intended clicks are often interpreted as tiny drags
            mouse.move( evt.stageX, evt.stageY );
                        
            var appState = ui.getEditorMode();
            if( mouse.isDragging() ) {
            
                if( appState == "add" || appState == "edit" ) {
                    n.nodeCntr.x = evt.stageX - w / 2 + 0.5;
                    n.nodeCntr.y = evt.stageY - h / 2 + 0.5;
                    n.x = evt.stageX;
                    n.y = evt.stageY;
                    _dirtyLinks = true; 
                    _dirty = true;
                }
                else if( appState == "link" ) {
                
                    var hit = hitTestNodes( evt.stageX, evt.stageY );
                    
                    // Snap the link cursor to the center of a node if we are dragging over it 
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
            if( !mouse.isDragging() ) {
                // We were not dragging, so this is a legitimate click
                
                if( ui.getEditorMode() == "del" ) {
                
                    sim.deleteDevice( n.key )
                    deleteNode( n );
                    updateNeighbors();                  
                    
                    update();
                    ui.updatePanels();
                    ui.updateTabs();
                }
                else { 
                    //testPackets( n );
                    testDrop( n );
                }
                
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

            mouse.up();
        });
        

    }

    // Update node state to match model. 
    // For now this is just the device name
    Node.prototype.update = function() {
            
        if( this._device ) {
            this.name = this._device.getHostName();
            this.nodeTxt.text = this._device.getHostName();
        }
    }
    
    Node.prototype.attach = function( key ) {
        
        this._device = sim.getDeviceByKey( key );
        if( !this._device ) {
            return false;
        }
        updateNeighbors();
        return true;
    }
    
    // We maintain a EaselJS container object for each connected segment a node has to hold the
    // packet shapes as they travel along a segment. Upon updating neighbors, we want to remove 
    // any old containers and create any new ones needed.
    Node.prototype.updateNeighbors = function() {
        
        if( !this._device ) {
            throw new Error("updateNeighbors: Node not attached.");
        }

        var nInterfaces;
        
        // Go through the old neighbor list and delete link containers. It would be more efficient
        // to only remove / add them as necessary instead of doing a complete reset... TODO? 
        for( var n in this._neighbors ) {
            
            nInterfaces = this._neighbors[n].interfaces.length;
            for( var i = 0; i < nInterfaces; i++ ) {
            
                var iface = this._neighbors[n].interfaces[i];
                
                if( iface.linkCntr ) {
                    iface.linkCntr.removeAllChildren();
                    _packetCntr.removeChild( iface.linkCntr );
                }
            }
        }

        // Now that the old link containers are gone, we can get the updated neighbor list
        this._neighbors = this._device.getNeighbors();
        
        // And create the new containers
        for( var n in this._neighbors ) {
            
            nInterfaces = this._neighbors[n].interfaces.length;
            for( var i = 0; i < nInterfaces; i++ ) {
                
                var iface = this._neighbors[n].interfaces[i];
                
                iface.linkCntr = new createjs.Container();
                _packetCntr.addChild( iface.linkCntr );
            }
        }
    }
    
    Node.prototype.setBandColor = function( strokeColor, fillColor ) {
        
        this.nodeBand.graphics.clear();
 

        this.nodeBand.graphics.beginStroke(strokeColor).setStrokeStyle(4).beginFill(fillColor);
        this.nodeBand.graphics.drawCircle(  this.nodeImg.width/2, 
                                            this.nodeImg.height/2, 
                                            NODE_RADIUS - 3 ).endFill().endStroke();  

    }
    
    Node.prototype.toJSON = function() {
        
        return { 
            name: this.name,
            icon: this.icon,
            x:    this.x,
            y:    this.y
        }
    }
    
    Node.prototype.destroy = function() {
        delete this._device;
        this._neighbors.length = 0;
        
        this.nodeCntr.removeChild( this.nodeCirc );
        this.nodeCntr.removeChild( this.nodeBand );
        this.nodeCntr.removeChild( this.nodeBubbles );
        this.nodeCntr.removeChild( this.nodeBmp );
        this.nodeCntr.removeChild( this.nodeTxt );        
    }
    
    function addNode( node ) {
        
        if( !node || !node.name || !node.key ) {
            throw new Error( "Invalid Node name" );
        }
        if( _nodes[node.key] ) {
            throw new Error( "Node name collision" );
        }
        
        if( !node.attach( node.key ) ) {
            throw new Error( "Failed to attach node" );
        }
        
        _nodes[node.key] = node;
        _nodeCount++;
        
        _stage.addChild( node.nodeCntr );
        update();
    }   
    
    function deleteNode( node ) {
    
        _stage.removeChild( node.nodeCntr );
        node.destroy();
        
        delete _nodes[node.key];
        selectNode(null);
    }
    
    function reset() {
        _.forEach( _nodes, function( node ) {
           deleteNode( node ); 
        });
        ui.updatePanels();
        ui.updateTabs();
        update();
    }
    
    function init(id) {

        _canvas = document.getElementById(id);
        _DC = _canvas.getContext("2d"); 
        
        // Why you'd want to let canvas clicks select text in the first place, I have no idea.
        // But yeah, prevent that.
        _canvas.onselectstart = function () { return false; }

        _stage = new createjs.Stage( _canvas );
        _stage.enableMouseOver();

        // Draw sim background texture
        // This shape also serves as event handler for the sim workspace
        var bg = new createjs.Shape();
        bg.graphics.beginStroke("#000").setStrokeStyle(1).beginBitmapFill( img.get("bg") );
        bg.graphics.drawRect( 0, 0, _canvas.width - .5, _canvas.height - .5 ).endStroke().endFill();
        bg.on( "click", handleBGClick );

        _stage.addChild( bg );
     
        // Create container to hold network segment shapes
        _mainLinkCntr = new createjs.Container();  
        _mainLinkCntr.x = 0;
        _mainLinkCntr.y = 0;
        _stage.addChild( _mainLinkCntr );

        // Create container to hold packet tweening shapes
        _packetCntr = new createjs.Container();  
        _packetCntr.x = 0;
        _packetCntr.y = 0;
        _stage.addChild( _packetCntr );
        
        _linkCursor = new createjs.Shape();
        _stage.addChild( _linkCursor );
        
        _packetList = new LinkedList();        
        
        _fpsTxt = new createjs.Text( 0, "12px Arial", "#000" );
        _fpsTxt.x = _canvas.width - 20;
        _fpsTxt.y = 4;
     
        _stage.addChild( _fpsTxt );
        
        createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
        createjs.Ticker.setFPS(30);
        createjs.Ticker.addEventListener( "tick", handleTick );

        update( true );     
    }
    
    function importView( viewObject ) {
        
        if( !viewObject.nodes ) {
            throw "importModel: Missing required 'nodes' definition.";
        }
        
        for( var key in viewObject.nodes ) {
        
            var importNode = viewObject.nodes[key];

            var newNode = new Node( key, 
                                    importNode.name, 
                                    importNode.icon, 
                                    importNode.x, 
                                    importNode.y );
            
            addNode( newNode );
        }

        ui.updatePanels();
        ui.updateTabs();
        update();
    }
    
    function exportView() {
        var viewObject = {};
        
        viewObject.nodes = _nodes;

        return viewObject;
    }
    
    function update() {
        _dirty      = true;
        _dirtyLinks = true;
    }
    
    return { 
        // Public Classes
        Node:       Node,
        
        // Public Methods
        importView: importView,
        exportView: exportView,
        addNode:    addNode,
        deleteNode: deleteNode,
        getNodeByKey: getNodeByKey,
        sendPacket: sendPacket,
        dropPacket: dropPacket,
        reset:      reset,
        update:     update,
        init:       init
    };
});