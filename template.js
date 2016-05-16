/**
 * @namespace Template
 * @memberof Lapiz
 */
Lapiz.Module("Template", ["Collections"], function($L){
  var self = $L.Namespace();
  $L.set("Template", self.namespace);
  var std = $L.Namespace();
  self.set("Std", std.namespace);

  /*
    This could probably be done better. I like that when it finds a token,
    it replaces all instance at once.
    
    Special case:
    if the template is exactly one token, it will resolve that and return it
    even if that return is not a string.
  */
  var _tokenRe = /\$(\w+(?:\.\w+)*|\$)/;
  var _singleTokenRe = /^\$(\w+(?:\.\w+)*|\$)$/;
  std.method(function tokenizer(template, ctx, resolver){
    var token, val, structure, i, l;
    var singleToken = _singleTokenRe.exec(template);
    var out = template;
    if (singleToken){
      return resolver(singleToken[1], ctx);
    }
    while( !!(token = _tokenRe.exec(template)) ){
      val = resolver(token[1], ctx);
      if (val === undefined) { val = ""; }
      out = out.replace(token[0], val);
      template = template.replace(token[0], "");
    }
    return out;
  });

  /*
  Takes a string of the format "a.b.c" and returns ctx[a][b][c]
  Special Cases:
  $ returns ctx
  */
  std.method(function resolver(token, ctx){
    if (token === "$") { return ctx; }
    var val, l, i;
    token = token.split(".");
    val = ctx[token[0]];
    l = token.length;
    for(i=1; i<l; i+=1){
      if (val === undefined) { return val; }
      val = val[token[i]];
    }
    return val;
  });

  self.method(function Templator(tokenizer, resolver){
    return function(template, ctx){
      return tokenizer(template, ctx, resolver);
    };
  });

  std.set("templator", $L.Template.Templator($L.Template.Std.tokenizer, $L.Template.Std.resolver) );
  Object.freeze(self.Std);
  Object.freeze(self);
});