// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.


// Lodash mixins
// 
var mixins = mixins || {};

mixins._parse = function(path) {
  var str = (path || '').replace(/\[/g, '.[');
  var parts = str.match(/(\\\.|[^.]+?)+/g);
  var re = /\[(\d+)\]$/;
  var ret = [];
  var mArr = null;

  for (var i = 0, len = parts.length; i < len; i++) {
    mArr = re.exec(parts[i]);
    ret.push(mArr ? { i: parseFloat(mArr[1]) } : { p: parts[i] });
  }

  return ret;
};

mixins.getPathValue = function(obj, path) {
  
  var parsed = mixins._parse( path );
  var tmp = obj;
  var res;

  for (var i = 0, l = parsed.length; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if (!_.isUndefined(part.p)) tmp = tmp[part.p];
      else if (!_.isUndefined(part.i)) tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
};

_.mixin({ 'getPathValue': mixins.getPathValue });