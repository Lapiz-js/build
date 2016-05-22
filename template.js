Lapiz.Module("Template", ["Collections"], function($L){

  // > Lapiz.Template
  // Namespace for templating
  var self = $L.Namespace();
  $L.set($L, "Template", self.namespace);

  // > Lapiz.Template.Std
  // Namespace for the standard templators
  var std = $L.Namespace();
  self.set("Std", std.namespace);

  // > Lapiz.Template.Std.tokenizer(template, ctx, resolver)
  // Expects a string for the template. Finds tokens that being
  // with $. Passes the token (without the leading $) into
  // resolver and replaces them with the returned value.
  //
  // If the template is exactly one token, the value from
  // the resolver will be returned, even if that value is not
  // a string.
  var _tokenRe = /\$(\w+(?:\.\w+)*|\$)/;
  var _singleTokenRe = /^\$(\w+(?:\.\w+)*|\$)$/;
  std.meth(function tokenizer(template, ctx, resolver){
    template = Lapiz.parse.string(template);
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

  // > Lapiz.Template.Std.resolver(token, ctx)
  // takes a token, splits on dot and steps down through the fields.
  // If at any point it encounters undefined, it will return undefined.
  //
  // If the token is "$", it will return the ctx.
  std.meth(function resolver(token, ctx){
    if (token === "$") { return ctx; }
    var val, l, i;
    token = token.split(".");
    l = token.length;
    for(i=0; i<l; i+=1){
      if (ctx === undefined) { return ctx; }
      ctx = ctx[token[i]];
    }
    return ctx;
  });

  // > Lapiz.Template.Templator(tokenizer, resolver)
  // Returns a templator of the form:
  // > templator(template, ctx)
  // which will take a template and a context and return
  // their product.
  self.meth(function Templator(tokenizer, resolver){
    return function(template, ctx){
      return tokenizer(template, ctx, resolver);
    };
  });

  // > Lapiz.Template.Std.templator(template, ctx)
  // Standard Lapiz templator. Takes a string template with tokens
  // that begin with $ and replaces them with the matching value
  // from the context. Using "$$" as a token will use the exact
  // ctx value and passing in a template that is exactly one token
  // will return the matching value from the context, even if that
  // value is not a string.
  std.set("templator", $L.Template.Templator($L.Template.Std.tokenizer, $L.Template.Std.resolver) );
  Object.freeze(self.Std);
  Object.freeze(self);
});
