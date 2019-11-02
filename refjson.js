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

