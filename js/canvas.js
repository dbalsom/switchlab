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

app.factory( 'canvas', function( state, img, sim, mouse, ui, uiInfoPanels, notify ) {

    'use strict';
    var CANVAS_ID = "C";
    var NODE_RADIUS = 40;
    var INTERFACE_RADIUS = 8;
    var HIT_DISTANCE = 40;

    var _canvas; 
    var _DC;    
    var _stage = {};
    var _dirty = false;
    var _dirtyLinks = false;
    var _dirtyUI = false;

    var _linkCntr = {};    
    var _packetCntr = {};
    var _linkCursor = {};
    var _bubbleCntr = {};

    
    var _nodes = {};
    var _nodeCount = 0;

    var _tweens = [];
    var _animating = false;
    
    var _selectedNode;
    
    var _dragging = false;


    
    function hitTestNodes( x, y ) {
        for( var n in _nodes ) {
            if( u.testInCircle( x, y, _nodes[n].x, _nodes[n].y, HIT_DISTANCE )) {
                return _nodes[n];
            }
        }
        return null;
    }
    
    function handleTick( evt ) {

        if( _dirtyUI ) {
            ui.updateTabs();
            ui.updatePanels();
            _dirtyUI = false;
        }
        
        if( _dirtyLinks ) {
            updateLinks();
            _dirtyLinks = false;
        }
        
        if( _dirty || _animating ) {
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
       
            var newNode = new Node( newDevice.getHostName(), type, pt.x, pt.y );
            addNode( newNode );
            selectNode( newNode );
            
            ui.updateTabs();
            update();
        }
        else {
        
            console.log("Device creation failed: " + type );
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
    
    function updateLinks() {

        _linkCntr.removeAllChildren();
        var visitedList = [];
        
        if( _nodeCount >= 2 ) {
            for( var node in _nodes ) { 
                drawLinksFrom( _nodes[node], visitedList );
                visitedList[node] = true;
            }
        }
    }    
    
    function testPackets( node ) {
        if( node ) {
            var device = sim.getDeviceByHostName( node.name );
            if( device ) {
                var neighbors = device.getNeighbors();
            }
            for( var p in neighbors ) {
            
                for( var iface in neighbors[p].interfaces ) {
                
                    console.log( "Sending packet from interface " + neighbors[p].interfaces[iface].intName );
                    sendPacket( _selectedNode, neighbors[p].interfaces[iface].intName, _nodes[p] );
                }
                
            }
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
            
            ui.selectDevice( _selectedNode.name );
        }

        ui.updatePanels();
        _dirty = true;    
    }
    
    function sendPacket( srcNode, srcInt, dstNode ) {

        var srcBubble = _.find( srcNode.bubbleList, 
            function( bubble ) { 
                return bubble.intName == srcInt; 
            });
        
        if( !srcBubble ) {
            return false;
        }
                
        var packetShape = new createjs.Shape();
        
        packetShape.graphics.setStrokeStyle(1)
                            .beginStroke("black")
                            .beginFill("cyan")
                            .drawCircle( 0, 0, 8 )
                            .endFill()
                            .endStroke();
        packetShape.x = srcBubble.x;
        packetShape.y = srcBubble.y;
        

        console.log( "Tween from " + srcNode.x + "," + srcNode.y + " to " + dstNode.x + "," + dstNode.y );

        createjs.Tween.get( packetShape )
                      .to( { x: srcBubble.dstX, y: srcBubble.dstY }, 1000, createjs.Ease.getPowInOut(2.5) )
                      .call( function() { _animating = false; } );
        
        _packetCntr.addChild( packetShape );
        _tweens.push( packetShape );
        _animating = true;
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
        var bubbleDistance;
        var bubbleBump;
        var collisionAngle;
        var collision = false;
        var collideDistance = ((INTERFACE_RADIUS + 2) * 2 );
        
        srcBubbleShape.graphics.clear();
        node.bubbleList.length = 0;
        
        var device = sim.getDeviceByHostName( node.name );
        if( !device ) return;
        
        var neighbors = device.getNeighbors();
        
        for( var p in neighbors ) {
            
            neighborBubbleList.length = 0;
            nInterfaces = neighbors[p].interfaces.length;
            
            var bubbleSector = Math.atan((INTERFACE_RADIUS+1) / 
                                ((NODE_RADIUS+1 + INTERFACE_RADIUS+1))) * 2;
            var angleToNeighbor = u.findAngleFromLine( node.x, node.y, _nodes[p].x, _nodes[p].y );
            
            // We center the bubbles across an arc facing the current neighbor. 
            // We start at one end of the arc and draw bubbles at each sector 'slice', incrementing
            // the angle by 'bubbleSector' for each interface.
            // Conveniently, the angles can simply be mirrored at the destination device, so we
            // draw those at the same time. We keep a visited list to avoid overdraw.
            var bubbleIndex = ( nInterfaces - 1 ) / 2.0;
            var srcAngle = angleToNeighbor - ( bubbleIndex * bubbleSector );      
            var dstAngle = angleToNeighbor + ( bubbleIndex * bubbleSector ) + Math.PI;     
            
            // Draw bubbles for each interface connected to the current neighbor
            for( var i = 0; i < nInterfaces; i++ ) {
                collision = false;
                srcPt = u.findPointOnCircle(    node.x, node.y, 
                                                srcAngle, 
                                                NODE_RADIUS+1 + INTERFACE_RADIUS );

                // Collision check against previously drawn interface bubbles
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

                // Push bubble outwards to avoid collision
                // FIXME: Push bubble along link vector, not bubble angle vector?
                var sinTerm = (1 - (smallestDistance / collideDistance)) * (Math.PI/2);
                var bubbleBump = ( Math.abs( Math.sin( sinTerm )) * collideDistance );

                srcPt = u.findPointOnCircle(    node.x, node.y, 
                                                srcAngle, 
                                                NODE_RADIUS+1 + INTERFACE_RADIUS + bubbleBump );                
                dstPt = u.findPointOnCircle(    _nodes[p].x, _nodes[p].y, 
                                                dstAngle,
                                                NODE_RADIUS+1 + INTERFACE_RADIUS );
                
                var srcPtLocal = srcBubbleShape.globalToLocal( srcPt.x, srcPt.y );
                var dstPtLocal = srcBubbleShape.globalToLocal( dstPt.x, dstPt.y );
                 
                if( collision ) {
                    srcBubbleShape.graphics
                        .beginStroke("black").setStrokeStyle(1).beginFill("red");   
                }
                else {
                    srcBubbleShape.graphics
                        .beginStroke("black").setStrokeStyle(1).beginFill("white");
                }
                srcBubbleShape.graphics
                    .drawCircle( srcPtLocal.x, srcPtLocal.y, INTERFACE_RADIUS )
                    .endFill()
                    .endStroke();
                
                if( !visitedList[p] ) {
                    // Don't draw segment lines twice
                    linkShape.graphics.moveTo( srcPt.x, srcPt.y )
                        .beginStroke("black")
                        .setStrokeStyle(2)
                        .lineTo( dstPt.x, dstPt.y)
                        .endStroke();
                }

                neighborBubbleList.push({   x: srcPt.x, 
                                            y: srcPt.y, 
                                            dstX: dstPt.x,
                                            dstY: dstPt.y,
                                            intName: neighbors[p].interfaces[i].intName });
                
                // Adjust the angle for the next interface bubble. Mirrored for the destination
                // interface.
                srcAngle += bubbleSector;
                dstAngle -= bubbleSector;
            }           
            
            
            node.bubbleList = node.bubbleList.concat( neighborBubbleList );
        }
        _linkCntr.addChild( linkShape );
    }
    
    function Node( name, icon, x, y ) {

        var n = this; // Pull this node into closure scope for container events (fixme)
        this.name = name;
        this.icon = icon;
        this.x = x;
        this.y = y;
        
        this.nodeImg = img.get(icon);
        var w = this.nodeImg.width;
        var h = this.nodeImg.height;
        this.nodeBmp = new createjs.Bitmap(this.nodeImg);
        this.nodeBmp;
        this.nodeBmp.name = name; // the bitmap catches the mouseup event

        this.nodeTxtOut = new createjs.Text( name, "12px Arial", "#FFF" );
        this.nodeTxtOut.textAlign = "center";
        this.nodeTxtOut.x = this.nodeImg.width / 2;
        this.nodeTxtOut.y = -NODE_RADIUS;
        this.nodeTxtOut.outline = 2;
        
        this.nodeTxt = new createjs.Text( name, "12px Arial", "#000" ); 
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
        this.nodeCntr.addChild( this.nodeCirc );
        this.nodeCntr.addChild( this.nodeBand );
        this.nodeCntr.addChild( this.nodeBubbles );
        this.nodeCntr.addChild( this.nodeBmp );
        this.nodeCntr.addChild( this.nodeTxtOut );
        this.nodeCntr.addChild( this.nodeTxt );
        
        this.nodeCntr.x = this.x - this.nodeImg.width / 2 + 0.5;
        this.nodeCntr.y = this.y - this.nodeImg.height / 2 + 0.5;        
        
        this.nodeCntr.on( "pressup", function( evt ) {
            if( mouse.isDragging() ) {
                
                if( ui.getEditorMode() == "link" ) {
                    // We just stopped dragging in link mode, so check if we stopped at another 
                    // node. But don't link a node to itself, that would be silly.
                    
                    // The 'pressup' event is tied to the node that we started dragging on, so 
                    // we need to do our own hit-testing.
                    var endObj = hitTestNodes( evt.stageX, evt.stageY );
                    
                    if( endObj && endObj.name && endObj.name != name ) {
                        
                        var dstDev = sim.getDeviceByHostName( endObj.name );
                        
                        try {
                            sim.getDeviceByHostName( name ).connectTo( dstDev );
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
                
                testPackets( n );
                
                if( ui.getEditorMode() == "del" ) {
                
                    sim.deleteDevice( n.name )
                    deleteNode( n );
                    update();
                    ui.updatePanels();
                    ui.updateTabs();
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
        
        this.nodeCntr.removeChild( this.nodeCirc );
        this.nodeCntr.removeChild( this.nodeBand );
        this.nodeCntr.removeChild( this.nodeBubbles );
        this.nodeCntr.removeChild( this.nodeBmp );
        this.nodeCntr.removeChild( this.nodeTxt );        
    }
    
    function addNode( node ) {
        
        if( !node || !node.name ) {
            return;
        }
        if( _nodes[node.name] ) {
            return;
        }
        
        _nodes[node.name] = node;
        _nodeCount++;
        
        _stage.addChild( node.nodeCntr );
        update();
    }   
    
    function deleteNode( node ) {
    
        _stage.removeChild( node.nodeCntr );
        node.destroy();
        
        delete _nodes[node.name];
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

        _stage = new createjs.Stage( _canvas );
        _stage.enableMouseOver();

        // Draw sim background texture
        // This shape also serves as event handler for the sim workspace
        var bg = new createjs.Shape();
        bg.graphics.beginStroke("#000").setStrokeStyle(1).beginBitmapFill( img.get("bg") );
        bg.graphics.drawRect(0,0,_canvas.width-1.5, _canvas.height-1.5).endStroke().endFill();
        bg.on( "click", handleBGClick );

        _stage.addChild( bg );
     
        // Create container to hold network segment shapes
        _linkCntr = new createjs.Container();  
        _linkCntr.x = 0;
        _linkCntr.y = 0;
        _stage.addChild( _linkCntr );

        // Create container to hold packet tweening shapes
        _packetCntr = new createjs.Container();  
        _packetCntr.x = 0;
        _packetCntr.y = 0;
        _stage.addChild( _packetCntr );
        
        _linkCursor = new createjs.Shape();
        _stage.addChild( _linkCursor );
        
        createjs.Ticker.setFPS(30);
        createjs.Ticker.addEventListener( "tick", handleTick );

        update( true );     
    }
    
    function importView( viewObject ) {
        
        if( viewObject.view ) {
            throw "importModel: Missing required 'sim' definition.";
        }
        _.forEach( viewObject.nodes, function( importNode ) {

            var newNode = new Node( importNode.name, importNode.icon, importNode.x, importNode.y );
            addNode( newNode );
        });

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
        sendPacket: sendPacket,
        reset:      reset,
        update:     update,
        init:       init
    };
});