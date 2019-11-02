function stringify(value, dic=[], path=".") {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (value === NaN) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return escape(value);
  if (typeof value === "bigint") return value.toString() + "n";
  if (typeof value === "function") throw new Error("Function can't be stringified");

  var result = dic.find(x => x.value === value);
  if (result) return result.path;
  else dic.push({value, path});

  if (typeof value === "symbol") return "Symbol()";
  if (Array.isArray(value)) {
    buf = [];
    for(var i = 0; i < value.length; i++)
      buf[i] = i in value ? stringify(value[i], dic, path + "[" + i + "]") : "empty";
    return "[" + buf.join(",") + "]";
  }
  if (typeof value === "object") return "{" + Object.keys(value).filter(key => typeof key === "string").map(key => escape(key) + ":" + stringify(value[key], dic, path + "[" + escape(key) + "]")).join(",")+ "}";

  throw new Error("Unknoun type");

  function escape(string){
    return JSON.stringify(string)
  }
}

var parse = (() => {
  function token(token) {
    return function(text) {
      if(text.startsWith(token))
        return {success:true, result:token, rest:text.substring(token.length)};
      return {success:false};
    };
  }
  function regexp(pattern) {
    pattern = new RegExp(pattern.source.startsWith("^") ? pattern.source : "^" + pattern.source)
    return function(text) {
      var result = pattern.exec(text);
      if(result)
        return {success:true, result:result[0], rest:text.substring(result[0].length)};
      return {success:false};
    };
  }
  function choice(/* parsers... */) {
    var parsers = arguments;
    return function(text) {
      for (var i = 0; i < parsers.length; i++) {
        var parsed = parsers[i](text);
        if (parsed.success)
          return parsed;
      }
      return {success:false};
    }
  }
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
  function option(parser) {
    return function(text) {
      var parsed = parser(text);
      if (parsed.success) {
        return {success:true, result:parsed.result, rest:parsed.rest};
      } else {
        return {success:true, result:"", rest:text};
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
          return {success:false};
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
        return {success:true, result:fn(parsed.result), rest:parsed.rest};
      } else {
        return {success:false};
      }
    }
  }

  function flatten(value){
    if(Array.isArray(value)) return value.map(flatten).join("");
    else return value;
  }

  var ws = map(
    regexp(/[\u0020\u000A\u000D\u0009]*/)
  , result => "");
  var sign =
    regexp(/[+-]/);
  var onenine =
    regexp(/[1-9]/);
  var digit =
    regexp(/[0-9]/);
  var uint = choice(
    seq(onenine, many(digit)),
    digit
  );
  var bigint =map(
    seq(option(sign), uint, token("n"))
  , x=>({type:"bigint", value:BigInt(flatten[x[0], x[1]])}));
  var exponent = choice(
    seq(token('E'), option(sign), digit, many(digit)),
    seq(token('e'), option(sign), digit, many(digit))
  );
  var fraction =
    seq(token('.'), digit, many(digit));
  var number = map(choice(
    seq(option(sign), uint, option(fraction), option(exponent)),
    seq(option(sign), fraction, option(exponent)),
    seq(option(sign), token("Infinity")),
    token("NaN")
  ), x=>({type:"number", value:Number(flatten(x))}));
  var character =
    regexp(/([^\u0000-\u0019\"\\]|\\[\"\\\/bfnrt]|\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F])/)
  var string = map(
    seq(token('"'), many(character), token('"'))
  , x=>({type:"string", value:unescape(flatten(x))}));
  var reference = map(
    seq(token('.'), many(seq(token('['), choice( string, map(uint, x=>({value:Number(flatten(x))})) ), token(']'))))
    , x=>({type:"reference", path:x[1].map(y=>y[1].value), solved:false}))
  var element = map(
    seq(ws, choice(lazy(_=>value), reference, map(token("empty"), ()=>({type:"empty"}))), ws)
  , x=>x[1]);
  var array = choice(
    map(seq(token('['), element, many(seq(token(','), element)), token(']')), x=>{
      var elements = [x[1], ...x[2].map(y=>y[1])];
      var value = [];
      elements.forEach((y, i) => { if (y.type !== "reference" && y.type !== "empty") value[i] = y.value; });
      return {type:"array", elements, value};
    }),
    map(seq(token('['), ws, token(']')), x=>({type:"array", elements:[], value:[]}))
  );
  var member = map(
    seq(ws, string, ws, token(':'), ws, choice(lazy(_=>value), reference), ws)
  , x=>({key:x[1], value:x[5]}));
  var object = choice(
    map(seq(token('{'), member, many(seq(token(','), member)), token('}')), x=>{
      var members = [x[1], ...x[2].map(y=>y[1])];
      var value = {};
      members.forEach((x, i)=>{ if (x.value.type !== "reference") value[x.key.value] = x.value.value; });
      return {type:"object", members, value};
    }),
    map(seq(token('{'), ws, token('}')), x=>({type:"object", members:[], value:{}}))
  );
  var value = choice(
    object,
    array,
    string,
    number,
    bigint,
    map(token("Symbol()"), x=>({type:"symbol", value:Symbol()})),
    map(token("true"), x=>({type:"true", value:true})),
    map(token("false"), x=>({type:"false", value:false})),
    map(token("undefined"), x=>({type:"undefined", value:undefined})),
    map(token("null"), x=>({type:"null", value:null}))
  );
  var json = map(seq(ws, value, ws), x=>x[1]);

  function solve (result, root) {
    if (result.type === "array") {
      result.elements.forEach((x, i) => {
        if (x.type === "reference") {
          if (!x.solved) {
            var f = find(root, x.path);
            if(f.success) {
              result.value[i] = f.value;
              x.solved = true;
            }
            else unsolvedReference++;
          }
        }
        else if (x.type !== "empty") solve(x, root);
      });
    }
    if (result.type === "object") {
      result.members.forEach((x, i)=>{
        if (x.value.type === "reference") {
          if (!x.value.solved) {
            var f = find(root, x.path);
            if(f.success) {
              result.value[x.key.value] = f.value;
              x.value.solved = true;
            }
            else unsolvedReference++;
          }
        }
        else solve(x.value, root);
      });
    }
  }
  function find(obj, path) {
    if (path.length === 0) return {success:true, value:obj};
    if (path[0] in obj) return find(obj[path[0]], path.slice(1));
    return {success: false};
  }

  function unescape(string){
    JSON.parse(string);
  }

  var unsolvedReference = 0;

  return function (text, maxDepth = 3){
    var parsed = json(text);
    if (!parsed.success || parsed.rest !== "") throw new Error("Parse Error");

    var result = parsed.result;
    var value = parsed.result.value;
    for(var i = 0; i < maxDepth; i++) {
      unsolvedReference = 0;
      solve(result, value, value);
      console.log(unsolvedReference);
    }

    return value;
  }
})();
