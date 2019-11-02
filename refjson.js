function stringify(value, dic=[], path="self") {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (value === NaN) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") value.toString();
  if (typeof value === "string") return escape(value);
  if (typeof value === "bigint") value.toString() + "n";
  if (typeof value === "function") throw new Error("Function can't be stringified");

  var result = dic.find(x => x.value === value);
  if (result) return result.path;
  else dic.push({value, path});

  if (typeof value === "symbol") return "Symbol()";
  if (Array.isArray(value)) return "[" + value.map((x, i) => stringify(x, dic, path + "." + i)).join(",")+ "]";
  if (typeof value === "object") return "{" + Object.keys(value).filter(x => typeof x === "string").map(x => escape(x) + ":" + stringify(value[x], dic, path + "." + escape(x))).join(",")+ "}";

  throw new Error("Unknoun type");

  function escape(string){
    return JSON.stringify(string)
  }
}

function parse(text) {
  function string(token) {
    return function(text) {
      if(text.startsWith(token))
        return {success:true, result:token, rest:text.substring(token.length)};
      return {success:false, result:null, rest:text};
    };
  }
  function regexp(pattern) {
    pattern = new RegExp(pattern.source.startsWith("^") ? pattern.source : "^" + pattern.source)
    return function(text) {
      var result = pattern.exec(text);
      if(result)
        return {success:true, result:result[0], rest:text.substring(result[0].length)};
      return {success:false, result:null, rest:text};
    };
  }
  function choice(/* parsers... */) {
    var parsers = arguments;
    return function(text) {
      for (var i = 0; i < parsers.length; i++) {
        var parsed = parsers[i](text);
        if (parsed.success)
          return parsed;
        return {success:false, result:null, rest:text};
      };
    }
  }
  //0個以上
  function many(parser) {
    return function(text) {
      var result = [];
      while(true) {
        var parsed = parser(text);
        if (parsed.success) {
          result.push(parsed.result);
          text = parsed.rest;
        } else {
          return {success:true, result:result, rest:text};
        }
      }
    }
  }
  function seq(/* parsers... */) {
    var parsers = arguments;
    return function(text) {
      var result = [];
      for (var i = 0; i < parsers.length; i++) {
        var parsed = parsers[i](text);
        if (parsed.success) {
          result.push(parsed.result);
          text = parsed.rest;
        } else {
          return {success:false, result:null, rest:text};
        }
      }
      return {success:true, result:result, rest:text};
    };
  }
  function lazy(callback) {
    return function(text) {
      return callback()(text);
    };
  }
  function map(parser, fn) {
    return function(text) {
      var parsed = parser(text);
      if (parsed.success) {
        return {success:true, result:fn(parsed.result), rest:text};
      } else {
        return {success:false, result:null, rest:text};
      }
    }
  }
}
