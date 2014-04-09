

var STP = (STP || {});

STP.main = (function($) {

    var pub = {};
    var Canvas; 
    var DC;

    var ImageAssets = [
        {name: "switch", src: "img/switch.png"},
        {name: "bg", src: "img/sim_bg.png"}
    ];
      
    var Popups = {
        "switch": { id: "switchPopup" },
        "link": { id: "linkPopup" }
        };
    
    var SelectedSwitch;
    
var G = {
    dragging: false,
    menu_w: 100,
    menu_h: 30,
    button_labels: [ "Add", "Del", "Test" ],
    button_list:[],
    menu_active: 0,
    font_size: 12,
    images: [],
    switches: [],
    paths:[],
    menu:{},
    stage:{},
    link_ctr:{},
    dirty: false
 };

function stButton( text, shape, callback ) 
{
    this.text = text;
    this.shape = shape;
    this.callback = callback;
}

var stSwitch = function(pt) {
    this.pt = pt;
    this.name = "NewSwitch";
}

function loadImages( imageList, callback )
{
    var numImages = imageList.length;
    var loadedImages = 0;
    
    for( var i in imageList) {
        G.images[imageList[i].name] = new Image();
        G.images[imageList[i].name].onload = function() {
            if( ++loadedImages >= numImages ) {
                callback();
            }
        };
        G.images[imageList[i].name].src = imageList[i].src;
    }
}



function ColorLuminance(hex, lum) {
// Craig Buckler http://www.sitepoint.com/javascript-generate-lighter-darker-color/


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


function updateLinks() {

    G.link_ctr.removeAllChildren();
    
    if( G.switches.length >= 2 ) {
        
        for( j = 0 ; j < G.switches.length - 1 ; j++ ) { 
            for( i = j; i < G.switches.length - 1; i++ ) {

                var src_pt = G.switches[j].pt;
                var dst_pt = G.switches[i+1].pt;
                var link = new createjs.Shape();
                link.graphics.beginStroke("black").moveTo( src_pt.x, src_pt.y).lineTo( dst_pt.x, dst_pt.y ).endStroke();
                G.link_ctr.addChild( link );
            }
        }
   }

   G.dirty = true;
}

function getDistance( x1, y1, x2, y2 )
{
    
    return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
}

function newSwitch( pt )
{

    var newSw = new stSwitch( pt );
    newSw.name = chance.city();
    var swTxt = new createjs.Text(newSw.name, "12px Arial", "#000" ); 
    
    var idx = G.switches.push( newSw ) - 1;

    // add link shapes
    updateLinks();
    hidePopups();
    G.dragging = false;
    
    var swImg = G.images["switch"];
    var swBmp = new createjs.Bitmap(swImg);
    
    swBmp.shadow = new createjs.Shadow("dimgrey", 3, 3, 15);

    swTxt.textAlign = "center";
    swTxt.x = swImg.width / 2;
    swTxt.y = -15;
    
    var newCtr = new createjs.Container();  
    newCtr.name = new String( idx );
    newCtr.addChild( swBmp );
    newCtr.addChild( swTxt );

    newCtr.on( "mousedown", function( evt ) {
        G.dragging = false;
        hidePopups();
        });
        
    newCtr.on( "pressmove", function( evt ) {
        if( getDistance( G.switches[this.name].pt.x , G.switches[this.name].pt.y, evt.stageX, evt.stageY ) > 8 || G.dragging ) {
        
            G.dragging = true;
            this.x = evt.stageX - swImg.width / 2 + 0.5;
            this.y = evt.stageY - swImg.height / 2 + 0.5;
            G.switches[this.name].pt.x = evt.stageX;
            G.switches[this.name].pt.y = evt.stageY;
            updateLinks();
            G.dirty = true;
            }
        });
    
    newCtr.on( "click", function( evt ) {
        if( !G.dragging ) {
            var pt;
            var pt2 = {};
            var offset = $("#C").offset();
           
            pt = this.localToGlobal(0, 0);
            pt2.x = pt.x + offset.left + swImg.width + 10;
            pt2.y = pt.y + offset.top - ($("#"+Popups["switch"].id).height()/2 - swImg.height / 2);
            
            SelectedSwitch = newSw;
            
            showPopup( "switch", pt2 );
            }
        });
    
    newCtr.x = pt.x - swImg.width / 2 + 0.5;
    newCtr.y = pt.y - swImg.height / 2 + 0.5;
    
    G.stage.addChild( newCtr );   
}


function handleClick(evt)
{
}

function showPopup( popName, pt, speed )
{
    try {
        $("#" + Popups[popName].id ).show(speed).offset({ top: pt.y, left: pt.x });
    }
    catch( err ) {}
}

function hidePopups(speed)
{
    var pop;
    for( var i in Popups ) {
        try {
      $("#"+ Popups[i].id).hide(speed);
        }
        catch( err ) {}
    }
}

function createMenus() {

    for( i in G.button_labels ) {

        var button_container = new createjs.Container();
        var button_shape = new createjs.Shape();
        var button_shadow = new createjs.Shape();
        
        button_shape.graphics.beginStroke("#000").setStrokeStyle(2).beginFill("white");
        button_shape.graphics.drawRoundRect( 0, 0, G.menu_w, G.menu_h, 12 ).endFill().endStroke();
        
        var button_text = new createjs.Text( G.button_labels[i], "16px Arial", "#000" );
        button_text.x = G.menu_w / 2;
        button_text.y = G.menu_h / 2;
        button_text.textAlign = "center";
        button_text.textBaseline = "middle";
        
        button_shadow.graphics.beginFill("white").drawRoundRect(0,0, G.menu_w, G.menu_h, 12 ).endFill();
        button_shadow.shadow = new createjs.Shadow("dimgrey", 3, 3, 5);

        var button = new stButton( button_text, button_shape, handleClick );
        button_container.addChild( button_shadow );
        button_container.addChild( button_shape );
        button_container.addChild( button_text );
        button_container.x = 10;
        button_container.y = 10 + i * (G.menu_h + 10);
        G.stage.addChild( button_container );
        
        
    }
}

function clickSim( evt ) 
{
    if( $("#"+Popups["switch"].id).is(':visible')) {
        hidePopups();
    }
    else {
        newSwitch( {x: evt.stageX, y: evt.stageY} );
    }    
    G.stage.update();
}

function handleTick( evt )
{
    if( G.dirty ) {
        G.stage.update( evt );
        G.dirty = false;
    }
}

function init2()
{

    Canvas = document.getElementById("C");
    DC = Canvas.getContext("2d"); 

    G.stage = new createjs.Stage(Canvas);
    G.stage.enableMouseOver();

    // Draw sim background texture
    // This shape also serves as event handler for the sim workspace
    var bg = new createjs.Shape();
    bg.graphics.beginStroke("#000").setStrokeStyle(1).beginBitmapFill( G.images["bg"] );
    bg.graphics.drawRect(0,0,Canvas.width-1.5, Canvas.height-1.5).endStroke().endFill();
    bg.on( "click", clickSim );
    G.stage.addChild( bg );
 
    // Create container to hold network link shapes
    G.link_ctr = new createjs.Container();  
    G.link_ctr.x = 0;
    G.link_ctr.y = 0;
    G.stage.addChild( G.link_ctr );
    
    // Create menu buttons
    createMenus();
    
    createjs.Ticker.addEventListener( "tick", handleTick );

    G.stage.update();

}

    pub.getSelectedSwitch = function() {
        return SelectedSwitch;
    }

    pub.getSwitchList = function() {
        return G.switches;
    }

    pub.init = function() {
        // preload shiz
        loadImages( ImageAssets, init2 );
    }

    return pub;

}(jQuery));


$(document).ready(function()
{
    STP.main.init();
});
    
