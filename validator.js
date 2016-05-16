(function ValidatorModule($L){
  $L.Validator = function(validation, data, formatFunc){
    var validator = function(data, formatFunc){
      formatFunc = formatFunc || $L.Validator.format.array;
      var errs = {};
      var errBool = false;
      Lapiz.each(validation, function(key, validator){
        validator = validator.split("|");
        var val = data[key];
        var name = validator.shift();
        errs[key] = [];
        Lapiz.each(validator, function(i, validator){
          args = validator.split(":");
          var vName = args.shift();
          validator = $L.Validator[vName];
          if (!validator) {new Error(vName + " is not a validator");}
          var out = validator(name, val, args, data);
          errBool = errBool || !!out;
          if (out) {
            errs[key].push(out);
          }
        });
      });

      return formatFunc(errs, errBool);
    };

    if (data !== undefined){
      return validator(data, formatFunc);
    }
    return validator;
  };

  $L.Validator.required = function(name, val){
    if (val === "" || val === undefined){
      return name + " is required";
    }
    return false;
  };

  $L.Validator.min = function(name, val, args){
    var minLen = Lapiz.parse["int"](args[0]);
    var len = val.length;
    if (len < minLen && len > 0){
      return name + " must be at least " + minLen + " characters long";
    }
    return false;
  };

  $L.Validator.max = function(name, val, args){
    var maxLen = Lapiz.parse["int"](args[0]);
    var len = val.length;
    if (len > maxLen){
      return name + " cannot be longer than " + maxLen + " characters";
    }
    return false;
  };

  $L.Validator.numberMin = function(name, val, args){
    var min = Lapiz.parse.number(args[0]);
    val = Lapiz.parse.number(val);
    if (isNaN(val)) { return false; }
    if (val < min){
      return name + " must be at least " + min;
    }
    return false;
  };

  $L.Validator.numberMax = function(name, val, args){
    var max = Lapiz.parse.number(args[0]);
    val = Lapiz.parse.number(val);
    if (isNaN(val)) { return false; }
    if (val > max){
      return name + " must be less than" + max;
    }
    return false;
  };

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

  $L.Validator.format = {};
  $L.Validator.format.array = function(errs, errBool){
    if (!errBool) { return errBool; }
    return errs;
  };
  $L.Validator.format.divs = function(errs){
    var errDivs = [];
    $L.each(errs, function(k,v){
      errDivs.push("<div for='"+k+"'>" + v + "</div>");
    });
    return errDivs.join("");
  };
  $L.Validator.format.li = function(errs){
    return "<li>" + errs.join("</li><li>") + "</li>";
  };
  $L.Validator.format.ul = function(errs){
    return "<ul>" + Validator.li(errs) + "</ul>";
  };
})(Lapiz);