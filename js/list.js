/* 
    A particularly nasty little linked list implementation
    that mutates the objects it contains into nodes by 
    cramming properties into them. 
    
    Kind of like the human centipede. Look away.
*/

var db_list = angular.module('db_list', [] );

db_list.factory( 'LinkedList', function()
{
    'use strict';
   
    var LinkedList = function() {
    
        this.head = null;
        this.tail = null;
        this.length = 0;
    }


    LinkedList.prototype.isEmpty = function( obj ) {
        return !this.head;
    }
    
    LinkedList.prototype.push = function( obj ) {
        
        if( !this.head ) {
            // list is empty
            this.tail = this.head = obj;
            obj.__prev = null;
            obj.__next = null;
            this.length++;
            return;
        }

        var oldHead = this.head;
        this.head = obj;
            
        oldHead.__prev = obj;
        obj.__prev = null;
        obj.__next = oldHead;
        this.length++;
        return obj;
    }    
    
    LinkedList.prototype.queue = function( obj ) {
    
        if( !this.head ) {
            // list is empty
            this.tail = this.head = obj;
            obj.__prev = null;
            obj.__next = null;
            this.length++;
            return;
        }
        
        var oldTail = this.tail;
        this.tail = obj;
        
        oldTail.__next = obj;
        obj.__prev = oldTail;
        obj.__next = null;
        this.length++;
    }   
    
    LinkedList.prototype.pop = function() {
    
        if( !this.head ) { 
            return null;
        }
        var oldHead = this.head;
        
        this.head = oldHead.__next;
        if( !this.head ) {
            this.tail = null;
        }
        delete oldHead.__prev;
        delete oldHead.__next;
        this.length--;
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
        this.length = 0;
        
    }
    
    LinkedList.prototype.remove = function( obj ) {
        
        if( this.length == 1 ) {
            var foo = null;
        }
        
        if( obj.__next ) {
            obj.__next.__prev = obj.__prev;
        }
        else {
            // There's no next item, so set the tail to the previous item
            this.tail = obj.__prev;
        }
        if( obj.__prev ) {
            obj.__prev.__next = obj.__next;
        }
        else {
            // There's no previous item, so set the head to the next item
            this.head = obj.__next;
        }
        delete obj.__next;
        delete obj.__prev;
        
        this.length--;
    }
    
    return LinkedList;
});
