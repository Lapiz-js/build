Lapiz.Module("Validator", ["Collections"], function($L){

  // > Lapiz.Validator(validationRules)
  // > Lapiz.Validator(validationRules, data)
  // > Lapiz.Validator(validationRules, data, formatFunc)
  // If only validationRules are given, a validator function is returned.
  // If data is given, the validation rules are run against the data.
  /* >
    var personValidator = Lapiz.Validator({
      "id" : "required"
    });
  */
  $L.set.meth($L, function Validator(validationRules, data, formatFunc){
    function validator(data, formatFunc){
      formatFunc = formatFunc || $L.Validator.format.array;
      var errs = $L.Map();
      var errBool = false;
      Lapiz.each(validationRules, function(validator, name){
        validator = validator.split("|");
        var val = data[name];
        errs[name] = [];
        Lapiz.each(validator, function(validator){
          args = validator.split(":");
          var vName = args.shift();
          validator = $L.Validator[vName];
          if (!validator) {new Error(vName + " is not a validator");}
          var out = validator(name, val, args, data);
          errBool = errBool || !!out;
          if (out) {
            errs[name].push(out);
          }
        });
      });

      return formatFunc(errs, errBool);
    };

    if (data !== undefined){
      return validator(data, formatFunc);
    }
    return validator;
  });

  $L.set.meth($L.Validator, function required(name, val){
    if (val === "" || val === undefined){
      return name + " is required";
    }
    return false;
  });

  $L.set.meth($L.Validator, function min(name, val, args){
    var minLen = Lapiz.parse["int"](args[0]);
    var len = val.length;
    if (len < minLen && len > 0){
      return name + " must be at least " + minLen + " characters long";
    }
    return false;
  });

  $L.set.meth($L.Validator, function max(name, val, args){
    var maxLen = Lapiz.parse["int"](args[0]);
    var len = val.length;
    if (len > maxLen){
      return name + " cannot be longer than " + maxLen + " characters";
    }
    return false;
  });

  $L.set.meth($L.Validator, function numberMin(name, val, args){
    var min = Lapiz.parse.number(args[0]);
    val = Lapiz.parse.number(val);
    if (isNaN(val)) { return false; }
    if (val < min){
      return name + " must be at least " + min;
    }
    return false;
  });

  $L.set.meth($L.Validator, function numberMax(name, val, args){
    var max = Lapiz.parse.number(args[0]);
    val = Lapiz.parse.number(val);
    if (isNaN(val)) { return false; }
    if (val > max){
      return name + " must be less than" + max;
    }
    return false;
  });

  $L.Validator.number = function(name, val){
    if (val === "" || val === undefined) { return false; }
    val = Lapiz.parse.number(val);
    if (isNaN(val)) {
      return name + " must be a number";
    }
    return false;
  };

  $L.Validator.match = function(name, val, args, data){
    if (val !== data[args[0]]){
      return args[1] || "Passwords do not match";
    }
    return false;
  };

  var _emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  $L.Validator.email = function(name, val){
    if (val === "" || val === undefined) { return false; }
    val = Lapiz.parse.string(val);
    if (!_emailRegex.test(val)){
      return name + " must be a valid email";
    }
    return false;
  };

  $L.Validator.format = Lapiz.Map();
  $L.Validator.format.array = function(errs, errBool){
    return errBool ? errs : false;
  };

  $L.Validator.format.divs = function(errs, errBool){
    if (!errBool){ return false; }
    var errDivs = document.createDocumentFragment();
    $L.each(errs, function(v, k){
      var div = document.createElement("div");
      div.attributes['for'] = k;
      div.textContent = v;
      errDivs.appendChild(div);
    });
    return errDivs;
  };

  $L.Validator.format.li = function(errs, errBool){
    if (!errBool){ return false; }
    var errLis = document.createDocumentFragment();
    $L.each(errs, function(v, k){
      var li = document.createElement("li");
      li.attributes['for'] = k;
      li.textContent = v;
      errLis.appendChild(li);
    });
    return errLis;
  };

  $L.Validator.format.ul = function(errs, errBool){
    if (!errBool){ return false; }
    var ul = document.createElement("ul");
    ul.appendChild($L.Validator.format.li(errs, errBool));
    var df = document.createDocumentFragment();
    df.appendChild(ul);
    return df;
  };
});