
var db_filters = angular.module( 'db_filters', [] );

db_filters.filter('stopwatch', function() {

    return function( duration, showMS ) {
        var milliseconds = parseInt(( duration % 1000 ) / 100);
        var seconds = ( duration / 1000 ) % 60;
        var minutes = ( duration / (1000 * 60)) % 60;
        var hours   = ( duration / (1000 * 60 * 60));

        hours   = ((hours   < 10) ? "0" : "") + parseInt(hours);
        minutes = ((minutes < 10) ? ":0" : ":") + parseInt(minutes);
        seconds = ((seconds < 10) ? ":0" : ":") + parseInt(seconds);

        return hours + minutes + seconds + (showMS ? ( "." + milliseconds ) : "");
    }
});

db_filters.filter('clock', function() {

    return function( duration, showMS ) {
        var milliseconds = parseInt(( duration % 1000 ) / 100);
        var seconds = ( duration / 1000 ) % 60;
        var minutes = ( duration / (1000 * 60)) % 60;
        var hours   = ( duration / (1000 * 60 * 60)) % 24;

        hours   = ((hours   < 10) ? "0" : "") + parseInt(hours);
        minutes = ((minutes < 10) ? ":0" : ":") + parseInt(minutes);
        seconds = ((seconds < 10) ? ":0" : ":") + parseInt(seconds);

        return hours + minutes + seconds + (showMS ? ( "." + milliseconds ) : "");
    }
});

db_filters.filter('truncate', function() {
    
    return function(input, limit) {
        if( input != null && limit != null ) {
            if( input.length > limit ) { 
                return input.substring( 0, limit - 1 ) + "...";      
            }
            else { 
                return input;
            }
        }
        return null;
    }
});

db_filters.filter('capitalize', function() {
    return function(input) {
        if (input != null) {
            input = input.toLowerCase();
            return input.substring(0,1).toUpperCase() + input.substring(1);
        }
        return null;
    }
});

db_filters.filter('hexadecimal', function() {
    
    return function(input) {
        if( input != null ) { 
            return input.toString( 16 );        
        }
        return null;
    }
});
