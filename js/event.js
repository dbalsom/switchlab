
var db_events = angular.module( 'db_events', [ 'db_list' ] );

db_events.factory( 'events', function( LinkedList )
{
    var eventList = [];
    var eventQueue = new LinkedList();
    
    // Register an event handler for a specific class of event
    function on( eventClass, handler ) {
    
        if( !eventList[eventClass] ) {
            eventList[eventClass] = [ handler ];
        }
        else {
            eventList[eventClass].push( handler );
        }
    }
    
    // Process an event and execute the handler immediately
    function send( eventClass, eventType, params ) {
    
        if( !eventList[eventClass] ) {
            // No handler for this event class
            return;
        }
        var handlerList = eventList[eventClass];
                
        // Call all registered handlers for this class
        for( var i = 0; i < handlerList.length; i++ ) {
            handlerList[i]( eventType, params );
        }
    }   

    // Batch the event for processing with next process() call.
    function post( eventClass, eventType, params ) {
    
        eventQueue.push( { eventClass:  eventClass,
                           eventType:   eventType,
                           params:      params } );
    
    }   
    
    // Dispatch all queued events and call handlers.
    function dispatch() {
        
        while( eventQueue.length ) {
            var event1 = eventQueue.pop();
            send( event1.eventClass, event1.eventType, event1.params );
        }
    }
    
    return { 
        send: send,
        post: post,
        dispatch: dispatch,
        on: on
    }
});