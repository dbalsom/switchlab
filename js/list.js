/* 
    A particularly nasty little linked list implementation
    that mutates the objects it contains into nodes by 
    cramming properties into them. 
    
    Kind of like the human centipede. Look away.
*/
app.factory( 'LinkedList', function()
{
    'use strict';
   
    var LinkedList = function() {
    
        this.head = null;
        this.tail = null;
    }

    LinkedList.prototype.push = function( obj ) {
        
        if( !this.head ) {
            // list is empty
            this.tail = this.head = obj;
            obj.__prev = null;
            obj.__next = null;
            return;
        }

        var oldHead = this.head;
        this.head = obj;
            
        oldHead.__prev = obj;
        obj.__prev = null;
        obj.__next = oldHead;
        
        return obj;
    }    
    
    LinkedList.prototype.pop = function() {
    
        var oldHead = this.head;
        
        this.head = oldHead.__next;
        if( !this.head ) {
            this.tail = null;
        }
        delete oldHead.__prev;
        delete oldHead.__next;
        return oldHead;
    }
    
    LinkedList.prototype.clear = function() {
        
        var obj = this.head;
        var next;
        
        while( obj ) {
            next = obj.__next;
            delete obj.__next;
            delete obj.__prev;
            obj = next;
        }
        this.tail = null;
    }
    
    LinkedList.prototype.remove = function( obj ) {
        
        if( obj.__next ) {
            obj.__next.__prev = obj.__prev;
        }
        if( obj.__prev ) {
            obj.__prev.__next = obj.__next;
        }
        delete obj.__next;
        delete obj.__prev;
    }
    
    return LinkedList;
});
