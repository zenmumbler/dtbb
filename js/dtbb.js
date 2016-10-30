!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in v||(v[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==g.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=v[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(g.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=v[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return y[e]||(y[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return t.locked=!1,r},{id:r.name});t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=v[s],f=y[s];f?l=f.exports:c&&!c.declarative?l=c.esModule:c?(d(c),f=c.module,l=f.exports):l=p(s),f&&f.importers?(f.importers.push(t),t.dependencies.push(f)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=v[e];if(t)t.declarative?f(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=p(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=v[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);void 0!==typeof c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){var t={};if(("object"==typeof r||"function"==typeof r)&&r!==e)if(m)for(var n in r)"default"!==n&&c(t,r,n);else{var o=r&&r.hasOwnProperty;for(var n in r)"default"===n||o&&!r.hasOwnProperty(n)||(t[n]=r[n])}return t["default"]=r,x(t,"__useDefault",{value:!0}),t}function c(e,r,t){try{var n;(n=Object.getOwnPropertyDescriptor(r,t))&&x(e,t,n)}catch(o){return e[t]=r[t],!1}}function f(r,t){var n=v[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==g.call(t,u)&&(v[u]?f(u,t):p(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function p(e){if(I[e])return I[e];if("@node/"==e.substr(0,6))return I[e]=s(D(e.substr(6)));var r=v[e];if(!r)throw"Module "+e+" not present.";return a(e),f(e,[]),v[e]=void 0,r.declarative&&x(r.module.exports,"__esModule",{value:!0}),I[e]=r.declarative?r.module.exports:r.esModule}var v={},g=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},m=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(h){m=!1}var x;!function(){try{Object.defineProperty({},"a",{})&&(x=Object.defineProperty)}catch(e){x=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var y={},D="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,I={"@empty":{}};return function(e,n,o,a){return function(u){u(function(u){for(var d={_nodeRequire:D,register:r,registerDynamic:t,get:p,set:function(e,r){I[e]=r},newModule:function(e){return e}},i=0;i<n.length;i++)(function(e,r){r&&r.__esModule?I[e]=r:I[e]=s(r)})(n[i],arguments[i]);a(d);var l=p(e[0]);if(e.length>1)for(var i=1;i<e.length;i++)p(e[i]);return o?l["default"]:l})}}}("undefined"!=typeof self?self:global)

(["1"], [], true, function($__System) {
var require = this.require, exports = this.exports, module = this.module;
!function(e){function n(e,n){e=e.replace(l,"");var r=e.match(u),t=(r[1].split(",")[n]||"require").replace(s,""),i=p[t]||(p[t]=new RegExp(a+t+f,"g"));i.lastIndex=0;for(var o,c=[];o=i.exec(e);)c.push(o[2]||o[3]);return c}function r(e,n,t,o){if("object"==typeof e&&!(e instanceof Array))return r.apply(null,Array.prototype.splice.call(arguments,1,arguments.length-1));if("string"==typeof e&&"function"==typeof n&&(e=[e]),!(e instanceof Array)){if("string"==typeof e){var l=i.get(e);return l.__useDefault?l["default"]:l}throw new TypeError("Invalid require")}for(var a=[],f=0;f<e.length;f++)a.push(i["import"](e[f],o));Promise.all(a).then(function(e){n&&n.apply(null,e)},t)}function t(t,l,a){"string"!=typeof t&&(a=l,l=t,t=null),l instanceof Array||(a=l,l=["require","exports","module"].splice(0,a.length)),"function"!=typeof a&&(a=function(e){return function(){return e}}(a)),void 0===l[l.length-1]&&l.pop();var f,u,s;-1!=(f=o.call(l,"require"))&&(l.splice(f,1),t||(l=l.concat(n(a.toString(),f)))),-1!=(u=o.call(l,"exports"))&&l.splice(u,1),-1!=(s=o.call(l,"module"))&&l.splice(s,1);var p={name:t,deps:l,execute:function(n,t,o){for(var p=[],c=0;c<l.length;c++)p.push(n(l[c]));o.uri=o.id,o.config=function(){},-1!=s&&p.splice(s,0,o),-1!=u&&p.splice(u,0,t),-1!=f&&p.splice(f,0,function(e,t,l){return"string"==typeof e&&"function"!=typeof t?n(e):r.call(i,e,t,l,o.id)});var d=a.apply(-1==u?e:t,p);return"undefined"==typeof d&&o&&(d=o.exports),"undefined"!=typeof d?d:void 0}};if(t)c.anonDefine||c.isBundle?c.anonDefine&&c.anonDefine.name&&(c.anonDefine=null):c.anonDefine=p,c.isBundle=!0,i.registerDynamic(p.name,p.deps,!1,p.execute);else{if(c.anonDefine&&!c.anonDefine.name)throw new Error("Multiple anonymous defines in module "+t);c.anonDefine=p}}var i=$__System,o=Array.prototype.indexOf||function(e){for(var n=0,r=this.length;r>n;n++)if(this[n]===e)return n;return-1},l=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm,a="(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])",f="\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)",u=/\(([^\)]*)\)/,s=/^\s+|\s+$/g,p={};t.amd={};var c={isBundle:!1,anonDefine:null};i.amdDefine=t,i.amdRequire=r}("undefined"!=typeof self?self:global);
(function() {
var define = $__System.amdDefine;
define("2", ["require", "exports", "3"], function(require, exports, setutil_1) {
  "use strict";
  var DiacriticCharMapping = {
    "À": "A",
    "Á": "A",
    "Â": "A",
    "Ã": "A",
    "Ä": "A",
    "Å": "A",
    "Ç": "C",
    "È": "E",
    "É": "E",
    "Ê": "E",
    "Ë": "E",
    "Ì": "I",
    "Í": "I",
    "Î": "I",
    "Ï": "I",
    "Ñ": "N",
    "Ò": "O",
    "Ó": "O",
    "Ô": "O",
    "Õ": "O",
    "Ö": "O",
    "Ø": "O",
    "Ù": "U",
    "Ú": "U",
    "Û": "U",
    "Ü": "U",
    "Ý": "Y",
    "ß": "ss",
    "à": "a",
    "á": "a",
    "â": "a",
    "ã": "a",
    "ä": "a",
    "å": "a",
    "ç": "c",
    "è": "e",
    "é": "e",
    "ê": "e",
    "ë": "e",
    "ì": "i",
    "í": "i",
    "î": "i",
    "ï": "i",
    "ñ": "n",
    "ò": "o",
    "ó": "o",
    "ô": "o",
    "õ": "o",
    "ö": "o",
    "ø": "o",
    "ù": "u",
    "ú": "u",
    "û": "u",
    "ü": "u",
    "ý": "y",
    "ÿ": "y"
  };
  var InvalidCharsMatcher = /[^a-zA-Z0-9ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/g;
  var DiacriticsMatcher = /[ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/;
  var DiacriticCharMatchers = {};
  Object.keys(DiacriticCharMapping).forEach(function(c) {
    return DiacriticCharMatchers[c] = new RegExp(c, "g");
  });
  var TextIndex = (function() {
    function TextIndex() {
      this.data_ = new Map();
      this.wordNGramCache_ = new Map();
      this.MIN_NGRAM_LENGTH = 2;
      this.MAX_NGRAM_LENGTH = 12;
      this.collapsedPunctuationMatcher = /['-]/g;
      this.multipleSpacesMatcher = / +/g;
    }
    TextIndex.prototype.save = function() {
      var json = {};
      this.data_.forEach(function(indexes, key) {
        var flatIndexes = [];
        indexes.forEach(function(index) {
          return flatIndexes.push(index);
        });
        json[key] = flatIndexes;
      });
      return json;
    };
    TextIndex.prototype.load = function(sti) {
      this.data_ = new Map();
      for (var key in sti) {
        this.data_.set(key, setutil_1.newSetFromArray(sti[key]));
      }
    };
    Object.defineProperty(TextIndex.prototype, "ngramCount", {
      get: function() {
        return this.data_.size;
      },
      enumerable: true,
      configurable: true
    });
    TextIndex.prototype.wordNGrams = function(word) {
      if (this.wordNGramCache_.has(word)) {
        return this.wordNGramCache_.get(word);
      } else {
        var wordLen = word.length;
        var ngrams = new Set();
        for (var l = this.MIN_NGRAM_LENGTH; l <= this.MAX_NGRAM_LENGTH; ++l) {
          if (l > wordLen) {
            break;
          }
          var maxO = wordLen - l;
          for (var o = 0; o <= maxO; ++o) {
            var ss = word.substr(o, l);
            if (!ngrams.has(ss)) {
              ngrams.add(ss);
            }
          }
        }
        this.wordNGramCache_.set(word, ngrams);
        return ngrams;
      }
    };
    TextIndex.prototype.stripDiacritics = function(term) {
      var r;
      while (r = term.match(DiacriticsMatcher)) {
        var mc = term[r.index];
        term = term.replace(DiacriticCharMatchers[mc], DiacriticCharMapping[mc]);
      }
      return term;
    };
    TextIndex.prototype.tokenizeString = function(s) {
      var cs = s.toLowerCase().replace(this.collapsedPunctuationMatcher, "").replace(InvalidCharsMatcher, " ").replace(this.multipleSpacesMatcher, " ").trim();
      var tokens = cs.split(" ");
      return setutil_1.newSetFromArray(tokens);
    };
    TextIndex.prototype.indexRawString = function(rs, ref) {
      var _this = this;
      var boxedRef = [ref];
      var tokenSet = this.tokenizeString(rs);
      tokenSet.forEach(function(token) {
        token = _this.stripDiacritics(token);
        var ngrams = _this.wordNGrams(token);
        ngrams.forEach(function(ngram) {
          if (!_this.data_.has(ngram)) {
            _this.data_.set(ngram, setutil_1.newSetFromArray(boxedRef));
          } else {
            _this.data_.get(ngram).add(ref);
          }
        });
      });
    };
    TextIndex.prototype.query = function(qs) {
      var _this = this;
      var qt = this.tokenizeString(qs);
      var termIndexSets = [];
      var hasEmptyResult = false;
      qt.forEach(function(term) {
        if (term.length < _this.MIN_NGRAM_LENGTH) {
          return;
        }
        if (term.length > _this.MAX_NGRAM_LENGTH) {
          term = term.substr(0, _this.MAX_NGRAM_LENGTH);
        }
        term = _this.stripDiacritics(term);
        if (_this.data_.has(term)) {
          termIndexSets.push(_this.data_.get(term));
        } else {
          hasEmptyResult = true;
        }
      });
      if (hasEmptyResult) {
        return new Set();
      }
      if (termIndexSets.length == 0) {
        return null;
      }
      termIndexSets.sort(function(a, b) {
        return a.size < b.size ? -1 : 1;
      });
      var result = new Set(termIndexSets[0]);
      for (var tisix = 1; tisix < termIndexSets.length; ++tisix) {
        result = setutil_1.intersectSet(result, termIndexSets[tisix]);
      }
      return result;
    };
    return TextIndex;
  }());
  exports.TextIndex = TextIndex;
});

})();
(function() {
var define = $__System.amdDefine;
define("4", ["require", "exports"], function(require, exports) {
  "use strict";
  var Watchable = (function() {
    function Watchable(initial) {
      this.watchers_ = [];
      this.purgeableWatchers_ = [];
      this.notifying_ = false;
      this.value_ = initial;
    }
    Watchable.prototype.watch = function(watcher) {
      if (this.watchers_.indexOf(watcher) === -1) {
        this.watchers_.push(watcher);
      }
    };
    Watchable.prototype.unwatch = function(watcher) {
      var watcherIndex = this.watchers_.indexOf(watcher);
      if (watcherIndex !== -1) {
        if (this.notifying_) {
          this.purgeableWatchers_.push(watcher);
        } else {
          this.watchers_.splice(watcherIndex, 1);
        }
      }
    };
    Watchable.prototype.notify = function() {
      this.notifying_ = true;
      this.purgeableWatchers_ = [];
      for (var _i = 0,
          _a = this.watchers_; _i < _a.length; _i++) {
        var w = _a[_i];
        w(this.value_);
      }
      this.notifying_ = false;
      for (var _b = 0,
          _c = this.purgeableWatchers_; _b < _c.length; _b++) {
        var pw = _c[_b];
        this.unwatch(pw);
      }
    };
    Watchable.prototype.get = function() {
      return this.value_;
    };
    Watchable.prototype.set = function(newValue) {
      this.value_ = newValue;
      this.notify();
    };
    Watchable.prototype.changed = function() {
      this.notify();
    };
    return Watchable;
  }());
  exports.Watchable = Watchable;
});

})();
(function() {
var define = $__System.amdDefine;
define("5", ["require", "exports", "6", "2", "3", "4"], function(require, exports, catalog_1, textindex_1, setutil_1, watchable_1) {
  "use strict";
  var allSet = new Set();
  var compoFilter = new Set();
  var jamFilter = new Set();
  var filterSets = new Map();
  for (var pk in catalog_1.Platforms) {
    filterSets.set(catalog_1.Platforms[pk].mask, new Set());
  }
  function makeDocID(issue, entryIndex) {
    return (issue << 16) | entryIndex;
  }
  exports.makeDocID = makeDocID;
  var GamesBrowserState = (function() {
    function GamesBrowserState() {
      this.plasticSurge_ = new textindex_1.TextIndex();
      this.platformMask_ = 0;
      this.category_ = "";
      this.query_ = "";
      this.filteredSet_ = new watchable_1.Watchable(new Set());
      this.entryData_ = [];
    }
    GamesBrowserState.prototype.filtersChanged = function() {
      var restrictionSets = [];
      if (this.query_.length > 0) {
        var textFilter = this.plasticSurge_.query(this.query_);
        if (textFilter) {
          restrictionSets.push(textFilter);
        }
      }
      if (this.category_ === "compo") {
        restrictionSets.push(compoFilter);
      } else if (this.category_ === "jam") {
        restrictionSets.push(jamFilter);
      }
      for (var pk in catalog_1.Platforms) {
        var plat = catalog_1.Platforms[pk];
        if (this.platformMask_ & plat.mask) {
          restrictionSets.push(filterSets.get(plat.mask));
        }
      }
      var resultSet;
      if (restrictionSets.length == 0) {
        resultSet = allSet;
      } else {
        restrictionSets.sort(function(a, b) {
          return a.size < b.size ? -1 : 1;
        });
        resultSet = new Set(restrictionSets[0]);
        for (var tisix = 1; tisix < restrictionSets.length; ++tisix) {
          resultSet = setutil_1.intersectSet(resultSet, restrictionSets[tisix]);
        }
      }
      this.filteredSet_.set(resultSet);
    };
    GamesBrowserState.prototype.acceptCatalogData = function(catalog) {
      var entries = catalog.entries.map(function(entry) {
        var indEntry = entry;
        indEntry.indexes = {platformMask: 0};
        return indEntry;
      });
      var count = entries.length;
      var t0 = performance.now();
      for (var entryIndex = 0; entryIndex < count; ++entryIndex) {
        var docID = makeDocID(catalog.issue, entryIndex);
        allSet.add(docID);
        var entry = entries[entryIndex];
        entry.indexes.platformMask = catalog_1.maskForPlatformKeys(entry.platforms);
        this.entryData_[docID] = entry;
        for (var pk in catalog_1.Platforms) {
          var plat = catalog_1.Platforms[pk];
          if (entry.indexes.platformMask & plat.mask) {
            filterSets.get(plat.mask).add(docID);
          }
        }
        if (entry.category === "compo") {
          compoFilter.add(docID);
        } else {
          jamFilter.add(docID);
        }
        this.plasticSurge_.indexRawString(entry.title, docID);
        this.plasticSurge_.indexRawString(entry.author.name, docID);
        this.plasticSurge_.indexRawString(entry.description, docID);
        for (var _i = 0,
            _a = entry.links; _i < _a.length; _i++) {
          var link = _a[_i];
          this.plasticSurge_.indexRawString(link.label, docID);
        }
      }
      var t1 = performance.now();
      console.info("Text Indexing took " + (t1 - t0).toFixed(1) + "ms");
    };
    Object.defineProperty(GamesBrowserState.prototype, "query", {
      get: function() {
        return this.query_;
      },
      set: function(q) {
        this.query_ = q;
        this.filtersChanged();
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "category", {
      get: function() {
        return this.category_;
      },
      set: function(c) {
        this.category_ = c;
        this.filtersChanged();
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "platform", {
      get: function() {
        return this.platformMask_;
      },
      set: function(p) {
        this.platformMask_ = p;
        this.filtersChanged();
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "filteredSet", {
      get: function() {
        return this.filteredSet_;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "entries", {
      get: function() {
        return this.entryData_;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "allSet", {
      get: function() {
        return allSet;
      },
      enumerable: true,
      configurable: true
    });
    return GamesBrowserState;
  }());
  exports.GamesBrowserState = GamesBrowserState;
});

})();
(function() {
var define = $__System.amdDefine;
define("6", ["require", "exports"], function(require, exports) {
  "use strict";
  function makePlatformLookup(plats) {
    var pl = {};
    var shift = 0;
    for (var _i = 0,
        plats_1 = plats; _i < plats_1.length; _i++) {
      var p = plats_1[_i];
      pl[p.key] = {
        key: p.key,
        label: p.label,
        mask: 1 << shift
      };
      shift += 1;
    }
    return pl;
  }
  exports.Platforms = makePlatformLookup([{
    key: "desktop",
    label: "Desktop"
  }, {
    key: "win",
    label: "Windows"
  }, {
    key: "mac",
    label: "MacOS"
  }, {
    key: "linux",
    label: "Linux"
  }, {
    key: "web",
    label: "Web"
  }, {
    key: "java",
    label: "Java"
  }, {
    key: "vr",
    label: "VR"
  }, {
    key: "mobile",
    label: "Mobile"
  }]);
  function maskForPlatformKeys(keys) {
    return keys.reduce(function(mask, key) {
      var plat = exports.Platforms[key];
      return mask | (plat ? plat.mask : 0);
    }, 0);
  }
  exports.maskForPlatformKeys = maskForPlatformKeys;
  exports.IssueThemeNames = {
    15: "Caverns",
    16: "Exploration",
    17: "Islands",
    18: "Enemies as Weapons",
    19: "Discovery",
    20: "It’s Dangerous to go Alone! Take this!",
    21: "Escape",
    22: "Alone",
    23: "Tiny World",
    24: "Evolution",
    25: "You are the Villain",
    26: "Minimalism",
    27: "10 Seconds",
    28: "You Only Get One",
    29: "Beneath the Surface",
    30: "Connected Worlds",
    31: "Entire Game on One Screen",
    32: "An Unconventional Weapon",
    33: "You are the Monster",
    34: "Two Button Controls, Growing",
    35: "Shapeshift",
    36: "Ancient Technology",
    37: "?"
  };
});

})();
(function() {
var define = $__System.amdDefine;
define("3", ["require", "exports"], function(require, exports) {
  "use strict";
  function intersectSet(a, b) {
    var intersection = new Set();
    var tiny;
    var large;
    if (a.size < b.size) {
      _a = [a, b], tiny = _a[0], large = _a[1];
    } else {
      _b = [b, a], tiny = _b[0], large = _b[1];
    }
    tiny.forEach(function(val) {
      if (large.has(val)) {
        intersection.add(val);
      }
    });
    return intersection;
    var _a,
        _b;
  }
  exports.intersectSet = intersectSet;
  function unionSet(a, b) {
    var tiny;
    var large;
    if (a.size < b.size) {
      _a = [a, b], tiny = _a[0], large = _a[1];
    } else {
      _b = [b, a], tiny = _b[0], large = _b[1];
    }
    var union = new Set(large);
    tiny.forEach(function(val) {
      union.add(val);
    });
    return union;
    var _a,
        _b;
  }
  exports.unionSet = unionSet;
  function mergeSet(dest, source) {
    source.forEach(function(val) {
      return dest.add(val);
    });
  }
  exports.mergeSet = mergeSet;
  function newSetFromArray(source) {
    var set = new Set();
    var len = source.length;
    for (var vi = 0; vi < len; ++vi) {
      set.add(source[vi]);
    }
    return set;
  }
  exports.newSetFromArray = newSetFromArray;
  function arrayFromSet(source) {
    var arr = [];
    source.forEach(function(val) {
      return arr.push(val);
    });
    return arr;
  }
  exports.arrayFromSet = arrayFromSet;
});

})();
(function() {
var define = $__System.amdDefine;
define("7", ["require", "exports", "6", "3", "8"], function(require, exports, catalog_1, setutil_1, domutil_1) {
  "use strict";
  var GamesGrid = (function() {
    function GamesGrid(containerElem_, state_) {
      var _this = this;
      this.containerElem_ = containerElem_;
      this.state_ = state_;
      this.rows_ = 0;
      this.cols_ = 0;
      this.gridOffsetX = 20;
      this.gridOffsetY = 20;
      this.cellWidth_ = 392;
      this.cellHeight_ = 122;
      this.cellMargin_ = 24;
      this.entryCount_ = 0;
      this.activeList_ = [];
      this.cells_ = [];
      this.entryTemplate_ = document.querySelector("#entry");
      this.scrollOffset_ = 0;
      this.firstVisibleRow_ = 0;
      this.entryCount_ = state_.allSet.size;
      this.activeList_ = setutil_1.arrayFromSet(state_.allSet);
      this.scrollingElem_ = containerElem_.parentElement;
      this.scrollingElem_.onscroll = function(evt) {
        _this.scrollPosChanged(evt.target.scrollTop);
      };
      state_.filteredSet.watch(function(filteredSet) {
        _this.activeSetChanged(filteredSet);
      });
      window.onresize = function() {
        _this.resized();
      };
      this.resized();
    }
    GamesGrid.prototype.activeSetChanged = function(newActiveSet) {
      this.entryCount_ = newActiveSet.size;
      this.activeList_ = setutil_1.arrayFromSet(newActiveSet);
      console.info("ASC", this.activeList_.slice(0, 20));
      this.relayout();
    };
    GamesGrid.prototype.makeCell = function() {
      var tile = this.entryTemplate_.content.cloneNode(true).firstElementChild;
      var pills = [];
      for (var _i = 0,
          _a = domutil_1.elemList(".pills span", tile); _i < _a.length; _i++) {
        var pill = _a[_i];
        pills[parseInt(pill.dataset["mask"])] = pill;
      }
      var cell = {
        tile: tile,
        link: tile.querySelector("a"),
        thumb: tile.querySelector(".thumb"),
        title: tile.querySelector("h2"),
        author: tile.querySelector("p.author span"),
        pills: pills,
        position: -1,
        contentIndex: -1,
        hidden: false
      };
      this.containerElem_.appendChild(tile);
      return cell;
    };
    GamesGrid.prototype.pixelPositionForCellPosition = function(cellPos) {
      var cellRow = Math.floor(cellPos / this.cols_);
      var cellCol = cellPos % this.cols_;
      return {
        left: this.gridOffsetX + (cellCol * (this.cellWidth_ + this.cellMargin_)),
        top: this.gridOffsetY + (cellRow * (this.cellHeight_ + this.cellMargin_))
      };
    };
    GamesGrid.prototype.ensureCellCount = function(cellCount) {
      if (cellCount < this.cells_.length) {
        var doomed = this.cells_.splice(cellCount);
        for (var _i = 0,
            doomed_1 = doomed; _i < doomed_1.length; _i++) {
          var c = doomed_1[_i];
          this.containerElem_.removeChild(c.tile);
          c.position = -1;
          c.contentIndex = -1;
        }
      } else {
        var position = this.cells_.length ? (this.cells_[this.cells_.length - 1].position) : -1;
        while (this.cells_.length < cellCount) {
          position += 1;
          var cell = this.makeCell();
          cell.position = position;
          this.cells_.push(cell);
        }
      }
    };
    GamesGrid.prototype.setCellPosition = function(cell, newPosition) {
      cell.position = newPosition;
      if (newPosition >= this.entryCount_) {
        cell.tile.style.display = "none";
        cell.hidden = true;
        return;
      }
      if (cell.hidden) {
        cell.hidden = false;
        cell.tile.style.display = "";
      }
      var cellPixelPos = this.pixelPositionForCellPosition(newPosition);
      cell.tile.style.left = cellPixelPos.left + "px";
      cell.tile.style.top = cellPixelPos.top + "px";
      var contentIndex = this.activeList_[newPosition];
      if (cell.contentIndex != contentIndex) {
        cell.contentIndex = contentIndex;
        var entry = this.state_.entries[contentIndex];
        cell.tile.dataset["eix"] = "" + contentIndex;
        cell.link.href = entry.entry_url;
        cell.link.className = entry.category;
        cell.thumb.style.backgroundImage = "url(" + entry.thumbnail_url + ")";
        cell.title.textContent = entry.title;
        cell.author.textContent = entry.author.name;
        for (var platKey in catalog_1.Platforms) {
          var plat = catalog_1.Platforms[platKey];
          var entryInMask = (entry.indexes.platformMask & plat.mask) !== 0;
          cell.pills[plat.mask].style.display = entryInMask ? "" : "none";
        }
      }
    };
    GamesGrid.prototype.relayout = function() {
      this.containerElem_.style.height = (this.gridOffsetY * 2) + (Math.ceil(this.entryCount_ / this.cols_) * (this.cellHeight_ + this.cellMargin_)) + "px";
      this.scrollOffset_ = this.scrollingElem_.scrollTop;
      var effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
      var effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
      var firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
      var position = firstViewRow * this.cols_;
      for (var _i = 0,
          _a = this.cells_; _i < _a.length; _i++) {
        var cell = _a[_i];
        this.setCellPosition(cell, position);
        position += 1;
      }
    };
    GamesGrid.prototype.moveCells = function(cellsToMove, positionOffset) {
      for (var c = 0; c < cellsToMove.length; ++c) {
        var cell = cellsToMove[c];
        this.setCellPosition(cell, cell.position + positionOffset);
      }
    };
    GamesGrid.prototype.moveRowsDown = function(rowCount) {
      var positionOffset = this.cells_.length;
      var cellsToMove = this.cells_.splice(0, rowCount * this.cols_);
      this.moveCells(cellsToMove, positionOffset);
      this.cells_ = this.cells_.concat(cellsToMove);
      this.firstVisibleRow_ += rowCount;
    };
    GamesGrid.prototype.moveRowsUp = function(rowCount) {
      var positionOffset = -this.cells_.length;
      var cellsToMove = this.cells_.splice((this.rows_ - rowCount) * this.cols_);
      this.moveCells(cellsToMove, positionOffset);
      this.cells_ = cellsToMove.concat(this.cells_);
      this.firstVisibleRow_ -= rowCount;
    };
    GamesGrid.prototype.scrollPosChanged = function(newScrollPos) {
      this.scrollOffset_ = newScrollPos;
      var effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
      var effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
      var firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
      var rowDiff = Math.abs(firstViewRow - this.firstVisibleRow_);
      if (rowDiff >= this.rows_) {
        this.moveCells(this.cells_, (firstViewRow - this.firstVisibleRow_) * this.cols_);
        this.firstVisibleRow_ = firstViewRow;
      } else if (firstViewRow > this.firstVisibleRow_) {
        this.moveRowsDown(rowDiff);
      } else if (firstViewRow < this.firstVisibleRow_) {
        this.moveRowsUp(rowDiff);
      }
    };
    GamesGrid.prototype.dimensionsChanged = function(newCols, newRows) {
      if (this.cols_ != newCols || this.rows_ != newRows) {
        this.cols_ = newCols;
        this.rows_ = newRows;
        this.ensureCellCount(this.rows_ * this.cols_);
        this.relayout();
      } else {
        var newScrollOffset = this.scrollingElem_.scrollTop;
        if (newScrollOffset != this.scrollOffset_) {
          this.scrollPosChanged(newScrollOffset);
        }
      }
    };
    GamesGrid.prototype.resized = function() {
      var OVERFLOW_ROWS = 1;
      var width = this.scrollingElem_.offsetWidth - this.gridOffsetX - 4;
      var height = this.scrollingElem_.offsetHeight - this.gridOffsetY;
      var cols = Math.floor(width / (this.cellWidth_ + this.cellMargin_));
      var rows = Math.ceil(height / (this.cellHeight_ + this.cellMargin_)) + OVERFLOW_ROWS;
      this.dimensionsChanged(cols, rows);
    };
    return GamesGrid;
  }());
  exports.GamesGrid = GamesGrid;
});

})();
(function() {
var define = $__System.amdDefine;
define("8", ["require", "exports"], function(require, exports) {
  "use strict";
  function loadTypedJSON(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.overrideMimeType("application/json");
      xhr.responseType = "json";
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = reject;
      xhr.send(null);
    });
  }
  exports.loadTypedJSON = loadTypedJSON;
  function elem(sel, base) {
    if (base === void 0) {
      base = document;
    }
    return (base.querySelector(sel));
  }
  exports.elem = elem;
  function elemList(sel, base) {
    if (base === void 0) {
      base = document;
    }
    return ([].slice.call(base.querySelectorAll(sel), 0));
  }
  exports.elemList = elemList;
});

})();
(function() {
var define = $__System.amdDefine;
define("1", ["require", "exports", "5", "7", "8"], function(require, exports, state_1, gamesgrid_1, domutil_1) {
  "use strict";
  var DATA_REVISION = 1;
  var DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
  var ENTRIES_URL = "data/ld36_entries" + DATA_EXTENSION + "?" + DATA_REVISION;
  var gamesGrid;
  exports.state = new state_1.GamesBrowserState();
  domutil_1.loadTypedJSON(ENTRIES_URL).then(function(catalog) {
    exports.state.acceptCatalogData(catalog);
    document.querySelector(".pleasehold").style.display = "none";
    var grid = document.querySelector(".entries");
    gamesGrid = new gamesgrid_1.GamesGrid(grid, exports.state);
    var searchControl = domutil_1.elem("#terms");
    searchControl.oninput = function(_) {
      exports.state.query = searchControl.value;
    };
    var categoryControls = domutil_1.elemList("input[name=category]");
    for (var _i = 0,
        categoryControls_1 = categoryControls; _i < categoryControls_1.length; _i++) {
      var cc = categoryControls_1[_i];
      cc.onchange = function(evt) {
        var ctrl = evt.target;
        if (ctrl.checked) {
          exports.state.category = ctrl.value;
        }
      };
    }
    var platformSelect = domutil_1.elem("select");
    platformSelect.onchange = function(evt) {
      var ctrl = evt.target;
      exports.state.platform = parseInt(ctrl.value);
    };
    searchControl.focus();
  });
});

})();
})
(function(factory) {
  if (typeof define == 'function' && define.amd)
    define([], factory);
  else if (typeof module == 'object' && module.exports && typeof require == 'function')
    module.exports = factory();
  else
    factory();
});