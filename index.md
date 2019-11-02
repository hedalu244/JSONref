# JSONref

Javascriptのオブジェクトの値や参照構造を保持できるようにしたJSONの拡張です。JSONのスーパーセットではありますが、JavaScriptのオブジェクトリテラルのサブセット *ではありません* 。JSONよりJavascriptに寄せ、JSONでは許容されない種々の書き方を許容しています。

## JSONで表現できなくてJSONrefで表現できるもの

+ 参照の同一性
+ 再帰
+ undefined
+ NaN
+ Infinity
+ -Infinity
+ empty（配列の空部分）
+ Symbol
+ BigInt

## JavaScriptのオブジェクトにあってJSONrefで表現できないもの

+ prototypeチェイン
+ 配列の、非自然数のキーに割り当てられたメンバー
+ Symbolをキーとするオブジェクトのメンバー
+ 関数オブジェクト（パースが重く、大変になるので）

## 仕様

以下の10種類の値を表現します。

+ `null`
+ `undefined`
+ Boolean
+ Symbol
+ Number
+ BigInt
+ String
+ 配列
+ オブジェクト
+ 参照

`null`は `null` で表現します。
`undefined` は `undefined` で表現します。
boolean は `true` または `false` で表現します。
Symbol は `Symbol()` で表現します。同じシンボルが複数回出現する場合は、代わりに参照（後述）を使います。

Numberは符号部、自然数部、小数部、指数部を順に並べて表現します。
いずれも省略可能ですが、整数部と小数部を両方省略することはできません。
符号部は `+` または `-` です。
自然数部は、十進法の自然数です。ただし、二桁以上の数の先頭に0を置くことはできません。つまり、`1`から`9`のいずれかから始まり、`0`から`9`のいずれかが0回以上続く形です。
小数部は、`.`から始まり、`0`から`9`のいずれかが1回以上続く形です。
指数部は、`e` または `E` 、符号（`+` または `-` ）、`0`から`9`のいずれかが1回以上続く形です。符号は省略可能です。

Numberはこの他に、`NaN`、`Infinity`、`+Infinity`、`-Infinity`の四つの特殊な形が認められます

Bigintは符号部、自然数部、`n` を順に並べて表現します。符号部は省略可能です。

Stringは`"`から`"`までの値です。

配列は `[` から `]` まで、カンマ区切りで値を並べることで表現します。

オブジェクトは `{` から `}` まで、カンマ区切りでメンバーを並べることで表現します。メンバーは String、 `:`、値を順に並べて表現します。

参照は配列、オブジェクト、Symbolの参照を、オブジェクト内の絶対パスによって表現します。

`.`は表現するオブジェクト（又は配列）全体を指します。
例えば以下のJavaScriptで構成される `foo` は `{a:.}`と表現されます。
```
let foo = {};
foo["a"] = foo;
```
`.`の下に`[`と`]`で挟んだキーを並べることで、メンバーを辿ることができます。
以下のように作られた `foo` は `{"a":Symbol(),"b":.["a"]}` または `{"a":.["a"],"b":Symbol()}` と表現されます。
```
let foo = {}, bar = Symbol();
foo["a"] = bar;
foo["b"] = bar;
```
配列であれば、キーは自然数となります。例えば以下のように作られた `foo` は `[Symbol(), .[0]]` または `[.[1], Symbol()]`と表現されます。
```
let foo = [1]; bar = Symbol();
foo.push(bar);
foo.push(bar);
```

参照の差す先が参照だった場合、再帰的に参照を解決しますが、`[.[0]]`のような無限ループは禁止です。

許容される形は、厳密には以下のpegに従います。

```
json
    ws value ws

value
    object
    array
    string
    number
    bigint
    "Symbol()"
    "true"
    "false"
    "undefined"
    "null"

object
    '{' ws '}'
    '{' member ( ',' member )* '}'

member
    ws string ws ':' ws (value | reference) ws

array
    '[' ws ']'
    '[' element ( ',' element )* ']'

element
    ws ( value | reference | "empty" ) ws

reference
    '.' ( '[' ( string | uint ) ']' )*

string
    '"' character* '"'

character
    /([^\u0000-\u0019\"\\]|\\[\"\\\/bfnrt]|\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F])/

number
    sign? uint fraction? exponent?
    sign? fraction exponent?
    sign? "Infinity"
    "NaN"

fraction
    '.' digit+

exponent
    'E' sign? digit+
    'e' sign? digit+


bigint
    sign? uint "n"

digit
    /[0-9]/

uint
  digit
  onenine digit*

onenine
    /[1-9]/

sign
    /[+-]/

ws
    /[\u0020\u000A\u000D\u0009]*/
```
