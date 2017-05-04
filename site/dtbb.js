(function (exports) {
'use strict';

function elem(sel, base) {
    if (base === void 0) { base = document; }
    return base.querySelector(sel);
}
function elemList(sel, base) {
    if (base === void 0) { base = document; }
    return [].slice.call(base.querySelectorAll(sel), 0);
}

function makePlatformLookup(plats) {
    var pl = {};
    var shift = 0;
    for (var _i = 0, plats_1 = plats; _i < plats_1.length; _i++) {
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
var Platforms = makePlatformLookup([
    { key: "desktop", label: "Desktop" },
    { key: "win", label: "Windows" },
    { key: "mac", label: "MacOS" },
    { key: "linux", label: "Linux" },
    { key: "web", label: "Web" },
    { key: "java", label: "Java" },
    { key: "vr", label: "VR" },
    { key: "mobile", label: "Mobile" },
]);
function maskForPlatformKeys(keys) {
    return keys.reduce(function (mask, key) {
        var plat = Platforms[key];
        return mask | (plat ? plat.mask : 0);
    }, 0);
}
var IssueThemeNames = {
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
    37: "One Room",
    38: "A Small World"
};
function localThumbURL(issue, ldThumbURL) {
    var fileName = ldThumbURL.split("/").splice(-1);
    return "data/thumbs/" + issue + "/" + fileName;
}

var WatchableValue = (function () {
    function WatchableValue(initial) {
        this.watchers_ = [];
        this.purgeableWatchers_ = [];
        this.notifying_ = false;
        this.value_ = initial;
    }
    WatchableValue.prototype.watch = function (watcher) {
        if (this.watchers_.indexOf(watcher) === -1) {
            this.watchers_.push(watcher);
        }
    };
    WatchableValue.prototype.unwatch = function (watcher) {
        var watcherIndex = this.watchers_.indexOf(watcher);
        if (watcherIndex !== -1) {
            if (this.notifying_) {
                this.purgeableWatchers_.push(watcher);
            }
            else {
                this.watchers_.splice(watcherIndex, 1);
            }
        }
    };
    WatchableValue.prototype.notify = function () {
        this.notifying_ = true;
        this.purgeableWatchers_ = [];
        for (var _i = 0, _a = this.watchers_; _i < _a.length; _i++) {
            var w = _a[_i];
            w(this.value_);
        }
        this.notifying_ = false;
        for (var _b = 0, _c = this.purgeableWatchers_; _b < _c.length; _b++) {
            var pw = _c[_b];
            this.unwatch(pw);
        }
    };
    WatchableValue.prototype.get = function () { return this.value_; };
    WatchableValue.prototype.set = function (newValue) {
        this.value_ = newValue;
        this.notify();
    };
    WatchableValue.prototype.changed = function () {
        this.notify();
    };
    Object.defineProperty(WatchableValue.prototype, "watchable", {
        get: function () { return this; },
        enumerable: true,
        configurable: true
    });
    return WatchableValue;
}());

function loadTypedJSON(url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.overrideMimeType("application/json");
        xhr.responseType = "json";
        xhr.onload = function () {
            resolve(xhr.response);
        };
        xhr.onerror = reject;
        xhr.send(null);
    });
}

// promised-db - IndexedDB wrapped in a promise-based API with contextual methods and timeout support. (https://github.com/zenmumbler/promised-db)
// (c) 2016-Present by Arthur Langereis (@zenmumbler)
var PromisedDB = (function () {
    function PromisedDB(name, version, upgrade) {
        this.db_ = this._request(indexedDB.open(name, version), function (openReq) {
            openReq.onupgradeneeded = function (upgradeEvt) {
                var db = openReq.result;
                upgrade(db, upgradeEvt.oldVersion, upgradeEvt.newVersion || version);
            };
        })
            .catch(function (error) {
            console.warn("PromisedDB: failed to open / upgrade database '" + name + "'", error);
        });
        // the TransactionContext is implemented as the private methods in PDB
        // bound to this and exposed as loose functions.
        this.tctx_ = {
            request: this._request.bind(this),
            cursor: this._cursor.bind(this),
            keyCursor: this._keyCursor.bind(this),
            getAll: this._getAll.bind(this),
            getAllKeys: this._getAllKeys.bind(this)
        };
    }
    PromisedDB.prototype.close = function () {
        this.db_.then(function (db) {
            db.close();
        });
    };
    PromisedDB.prototype.transaction = function (storeNames, mode, fn) {
        var _this = this;
        return this.db_.then(function (db) {
            return new Promise(function (resolve, reject) {
                var tr = db.transaction(storeNames, mode);
                tr.onerror = function () {
                    cancelTimeout();
                    reject(tr.error || "transaction failed");
                };
                tr.onabort = function () {
                    cancelTimeout();
                    reject("aborted");
                };
                var timeoutID = null;
                var cancelTimeout = function () {
                    if (timeoutID !== null) {
                        clearTimeout(timeoutID); // make timeouts work for both web and node contexts
                        timeoutID = null;
                    }
                };
                var tc = Object.create(_this.tctx_, {
                    timeout: {
                        value: function (ms) {
                            timeoutID = setTimeout(function () {
                                timeoutID = null;
                                tr.abort();
                            }, ms);
                        }
                    }
                });
                var result = fn(tr, tc);
                tr.oncomplete = function () {
                    cancelTimeout();
                    resolve(result);
                };
            });
        });
    };
    PromisedDB.prototype._request = function (req, fn) {
        var reqProm = new Promise(function (resolve, reject) {
            req.onerror = function () { reject(req.error || "request failed"); };
            req.onsuccess = function () { resolve(req.result); };
            if (fn) {
                fn(req);
            }
        });
        return this.db_ ? this.db_.then(function () { return reqProm; }) : reqProm;
    };
    PromisedDB.prototype._cursorImpl = function (cursorReq) {
        var result = {
            next: function (callback) {
                this.callbackFn_ = callback;
                return this;
            },
            complete: function (callback) {
                this.completeFn_ = callback;
                return this;
            },
            catch: function (callback) {
                this.errorFn_ = callback;
                return this;
            }
        };
        cursorReq.onerror = function () {
            if (result.errorFn_) {
                result.errorFn_(cursorReq.error);
            }
        };
        cursorReq.onsuccess = function () {
            var cursor = cursorReq.result;
            if (cursor) {
                if (result.callbackFn_) {
                    result.callbackFn_(cursor);
                }
            }
            else {
                if (result.completeFn_) {
                    result.completeFn_();
                }
            }
        };
        return result;
    };
    PromisedDB.prototype._cursor = function (container, range, direction) {
        var cursorReq = container.openCursor(range, direction);
        return this._cursorImpl(cursorReq);
    };
    // IDB 2 has IDBObjectStore.openKeyCursor, but 1 does not
    PromisedDB.prototype._keyCursor = function (index, range, direction) {
        var cursorReq = index.openKeyCursor(range, direction);
        return this._cursorImpl(cursorReq);
    };
    PromisedDB.prototype._getAll = function (container, range, direction, limit) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var result = [];
            _this._cursor(container, range, direction)
                .next(function (cur) {
                result.push(cur.value);
                if (limit && (result.length === limit)) {
                    resolve(result);
                }
                else {
                    cur.continue();
                }
            })
                .complete(function () {
                resolve(result);
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    PromisedDB.prototype._getAllKeys = function (container, range, direction, limit) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var result = [];
            _this._keyCursor(container, range, direction)
                .next(function (cur) {
                result.push(cur.primaryKey);
                if (limit && (result.length === limit)) {
                    resolve(result);
                }
                else {
                    cur.continue();
                }
            })
                .complete(function () {
                resolve(result);
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    return PromisedDB;
}());

var DB_NAME = "dtbb";
var CatalogPersistence = (function () {
    function CatalogPersistence() {
        this.db_ = new PromisedDB(DB_NAME, 1, function (db, _oldVersion, _newVersion) {
            console.info("Creating stores and indexes...");
            var headers = db.createObjectStore("headers", { keyPath: "issue" });
            var textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
            var entries = db.createObjectStore("entries", { keyPath: "docID" });
            headers.createIndex("issue", "issue", { unique: true });
            textindexes.createIndex("issue", "issue", { unique: true });
            entries.createIndex("issue", "ld_issue");
        });
    }
    CatalogPersistence.prototype.saveCatalog = function (catalog, indEntries, sti) {
        var header = {
            issue: catalog.issue,
            theme: catalog.theme,
            stats: catalog.stats,
            savedAt: new Date()
        };
        return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", function (tr, _a) {
            var timeout = _a.timeout;
            console.info("Storing issue " + header.issue + " with " + indEntries.length + " entries and textindex");
            timeout(10000);
            var headers = tr.objectStore("headers");
            var entries = tr.objectStore("entries");
            var textindexes = tr.objectStore("textindexes");
            headers.put(header);
            var textIndex = {
                issue: catalog.issue,
                data: sti
            };
            textindexes.put(textIndex);
            for (var _i = 0, indEntries_1 = indEntries; _i < indEntries_1.length; _i++) {
                var entry = indEntries_1[_i];
                entries.put(entry);
            }
        })
            .catch(function (error) {
            console.warn("Error saving catalog " + catalog.issue, error);
            throw error;
        });
    };
    CatalogPersistence.prototype.saveCatalogTextIndex = function (issue, sti) {
        var data = {
            issue: issue,
            data: sti
        };
        return this.db_.transaction("textindexes", "readwrite", function (tr, _a) {
            var textindexes = tr.objectStore("textindexes");
            textindexes.put(data);
        })
            .catch(function (error) {
            console.warn("Error saving textindex: ", error);
            throw error;
        });
    };
    CatalogPersistence.prototype.persistedIssues = function () {
        return this.db_.transaction("headers", "readonly", function (tr, _a) {
            var getAll = _a.getAll;
            var issueIndex = tr.objectStore("headers").index("issue");
            return getAll(issueIndex, undefined, "nextunique");
        })
            .catch(function () { return []; });
    };
    CatalogPersistence.prototype.loadCatalog = function (issue) {
        return this.db_.transaction(["headers", "entries", "textindexes"], "readonly", function (tr, _a) {
            var request = _a.request, getAll = _a.getAll, timeout = _a.timeout;
            timeout(5000);
            var headerP = request(tr.objectStore("headers").get(issue));
            var issueIndex = tr.objectStore("entries").index("issue");
            var entriesP = getAll(issueIndex, issue);
            var ptiP = request(tr.objectStore("textindexes").get(issue));
            return Promise.all([headerP, entriesP, ptiP])
                .then(function (result) {
                var pti = result[2];
                return {
                    header: result[0],
                    entries: result[1],
                    sti: pti && pti.data
                };
            });
        })
            .catch(function () { return null; });
    };
    CatalogPersistence.prototype.destroyCatalog = function (issue) {
        var _this = this;
        return this.db_.transaction(["entries"], "readonly", function (tr, _a) {
            var getAllKeys = _a.getAllKeys;
            var issueIndex = tr.objectStore("entries").index("issue");
            return getAllKeys(issueIndex, issue);
        })
            .then(function (entryKeys) {
            return _this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", function (tr, _a) {
                var headers = tr.objectStore("headers");
                var entries = tr.objectStore("entries");
                var indexes = tr.objectStore("textindexes");
                if (entryKeys.length > 0) {
                    var range = IDBKeyRange.bound(entryKeys[0], entryKeys[entryKeys.length - 1]);
                    entries.delete(range);
                }
                headers.delete(issue);
                indexes.delete(issue);
            });
        });
    };
    CatalogPersistence.prototype.purgeAllData = function () {
        return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", function (tr, _a) {
            var headers = tr.objectStore("headers");
            var entries = tr.objectStore("entries");
            var indexes = tr.objectStore("textindexes");
            headers.clear();
            entries.clear();
            indexes.clear();
        });
    };
    CatalogPersistence.prototype.deleteDatabase = function () {
        this.db_.close();
        return new Promise(function (resolve, reject) {
            var req = indexedDB.deleteDatabase(DB_NAME);
            req.onerror = function (err) { reject(err); };
            req.onsuccess = function () { resolve(); };
        });
    };
    return CatalogPersistence;
}());

function intersectSet(a, b) {
    var intersection = new Set();
    var tiny;
    var large;
    if (a.size < b.size) {
        _a = [a, b], tiny = _a[0], large = _a[1];
    }
    else {
        _b = [b, a], tiny = _b[0], large = _b[1];
    }
    tiny.forEach(function (val) {
        if (large.has(val)) {
            intersection.add(val);
        }
    });
    return intersection;
    var _a, _b;
}

function mergeSet(dest, source) {
    if (source && source.forEach) {
        source.forEach(function (val) { return dest.add(val); });
    }
}
function newSetFromArray(source) {
    var set = new Set();
    var len = source.length;
    for (var vi = 0; vi < len; ++vi) {
        set.add(source[vi]);
    }
    return set;
}
function arrayFromSet(source) {
    var arr = [];
    source.forEach(function (val) { return arr.push(val); });
    return arr;
}

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
    "ÿ": "y",
};
var InvalidCharsMatcher = /[^a-zA-Z0-9ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/g;
var DiacriticsMatcher = /[ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/;
var DiacriticCharMatchers = {};
Object.keys(DiacriticCharMapping).forEach(function (c) { return DiacriticCharMatchers[c] = new RegExp(c, "g"); });
var TextIndex = (function () {
    function TextIndex() {
        this.data_ = new Map();
        this.wordNGramCache_ = new Map();
        this.MIN_NGRAM_LENGTH = 2;
        this.MAX_NGRAM_LENGTH = 12;
        this.collapsedPunctuationMatcher = /['-]/g;
        this.multipleSpacesMatcher = / +/g;
    }
    TextIndex.prototype.export = function () {
        var json = {};
        this.data_.forEach(function (indexes, key) {
            var flatIndexes = [];
            indexes.forEach(function (index) { return flatIndexes.push(index); });
            json[key] = flatIndexes;
        });
        return json;
    };
    TextIndex.prototype.import = function (index) {
        var _this = this;
        if (index instanceof TextIndex) {
            index.data_.forEach(function (indexes, key) {
                if (_this.data_.has(key)) {
                    mergeSet(_this.data_.get(key), indexes);
                }
                else {
                    _this.data_.set(key, indexes);
                }
            });
        }
        else {
            for (var key in index) {
                if (this.data_.has(key)) {
                    mergeSet(this.data_.get(key), index[key]);
                }
                else {
                    this.data_.set(key, newSetFromArray(index[key]));
                }
            }
        }
    };
    Object.defineProperty(TextIndex.prototype, "ngramCount", {
        get: function () {
            return this.data_.size;
        },
        enumerable: true,
        configurable: true
    });
    TextIndex.prototype.wordNGrams = function (word) {
        if (this.wordNGramCache_.has(word)) {
            return this.wordNGramCache_.get(word);
        }
        else {
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
    TextIndex.prototype.stripDiacritics = function (term) {
        var r;
        while (r = term.match(DiacriticsMatcher)) {
            var mc = term[r.index];
            term = term.replace(DiacriticCharMatchers[mc], DiacriticCharMapping[mc]);
        }
        return term;
    };
    TextIndex.prototype.tokenizeString = function (s) {
        var cs = s.toLowerCase().replace(this.collapsedPunctuationMatcher, "").replace(InvalidCharsMatcher, " ").replace(this.multipleSpacesMatcher, " ").trim();
        var tokens = cs.split(" ");
        return newSetFromArray(tokens);
    };
    TextIndex.prototype.indexRawString = function (rs, ref) {
        var _this = this;
        var boxedRef = [ref];
        var tokenSet = this.tokenizeString(rs);
        tokenSet.forEach(function (token) {
            token = _this.stripDiacritics(token);
            var ngrams = _this.wordNGrams(token);
            ngrams.forEach(function (ngram) {
                if (!_this.data_.has(ngram)) {
                    _this.data_.set(ngram, newSetFromArray(boxedRef));
                }
                else {
                    _this.data_.get(ngram).add(ref);
                }
            });
        });
    };
    TextIndex.prototype.query = function (qs) {
        var _this = this;
        var qt = this.tokenizeString(qs);
        var termIndexSets = [];
        var hasEmptyResult = false;
        qt.forEach(function (term) {
            if (term.length < _this.MIN_NGRAM_LENGTH) {
                return;
            }
            if (term.length > _this.MAX_NGRAM_LENGTH) {
                term = term.substr(0, _this.MAX_NGRAM_LENGTH);
            }
            term = _this.stripDiacritics(term);
            if (_this.data_.has(term)) {
                termIndexSets.push(_this.data_.get(term));
            }
            else {
                hasEmptyResult = true;
            }
        });
        if (hasEmptyResult) {
            return new Set();
        }
        if (termIndexSets.length === 0) {
            return null;
        }
        termIndexSets.sort(function (a, b) { return a.size < b.size ? -1 : 1; });
        var result = new Set(termIndexSets[0]);
        for (var tisix = 1; tisix < termIndexSets.length; ++tisix) {
            result = intersectSet(result, termIndexSets[tisix]);
        }
        return result;
    };
    return TextIndex;
}());

var IndexerAPI = (function () {
    function IndexerAPI() {
        var _this = this;
        this.promFuncs_ = new Map();
        this.nextIndex_ = 0;
        this.worker_ = new Worker("task_indexer.js");
        this.worker_.onerror = function (event) {
            console.warn("An internal error occurred inside the indexer task: " + event.error + " @ " + event.lineno + ":" + event.colno);
        };
        this.worker_.onmessage = function (event) {
            var response = event.data;
            if (response && typeof response.status === "string" && typeof response.reqIndex === "number") {
                var funcs = _this.promFuncs_.get(response.reqIndex);
                if (funcs) {
                    if (response.status === "status") {
                        if (funcs.progress) {
                            funcs.progress(response.progress);
                        }
                    }
                    else {
                        if (response.status === "success") {
                            funcs.resolve(response);
                        }
                        else if (response.status === "error") {
                            funcs.reject(response);
                        }
                        _this.promFuncs_.delete(response.reqIndex);
                    }
                }
                else {
                    console.warn("IndexerAPI: Cannot find the functions for request #" + response.reqIndex);
                }
            }
            else {
                console.warn("IndexerAPI: Got an invalid response from the server: " + response);
            }
        };
    }
    IndexerAPI.prototype.promisedCall = function (req, progress) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.promFuncs_.set(req.reqIndex, { resolve: resolve, reject: reject, progress: progress });
            _this.worker_.postMessage(req);
        });
    };
    IndexerAPI.prototype.open = function () {
        this.nextIndex_ += 1;
        var req = {
            what: "open",
            reqIndex: this.nextIndex_
        };
        return this.promisedCall(req);
    };
    IndexerAPI.prototype.index = function (issue, progress) {
        this.nextIndex_ += 1;
        var req = {
            what: "index",
            reqIndex: this.nextIndex_,
            issue: issue
        };
        return this.promisedCall(req, progress);
    };
    IndexerAPI.prototype.exit = function () {
        this.worker_.terminate();
    };
    return IndexerAPI;
}());

function makeDocID(issue, entryIndex) {
    return (issue << 16) | entryIndex;
}
var CatalogIndexer = (function () {
    function CatalogIndexer(persist_, mode) {
        var _this = this;
        this.persist_ = persist_;
        if (mode === "worker") {
            this.api_ = new IndexerAPI();
            this.api_.open().catch(function () {
                console.warn("Got a failure when trying to connect to Indexer API, disabling");
                _this.api_ = undefined;
            });
        }
    }
    CatalogIndexer.prototype.acceptCatalogData = function (catalog) {
        var entries = catalog.entries.map(function (entry) {
            var indEntry = entry;
            indEntry.indexes = {
                platformMask: 0
            };
            return indEntry;
        });
        var count = entries.length;
        var textIndex = new TextIndex();
        for (var entryIndex = 0; entryIndex < count; ++entryIndex) {
            var entry = entries[entryIndex];
            var docID = makeDocID(catalog.issue, entryIndex);
            entry.docID = docID;
            entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);
            textIndex.indexRawString(entry.title, docID);
            textIndex.indexRawString(entry.author.name, docID);
            textIndex.indexRawString(entry.description, docID);
            for (var _i = 0, _a = entry.links; _i < _a.length; _i++) {
                var link = _a[_i];
                textIndex.indexRawString(link.label, docID);
            }
            if (this.onProgress) {
                this.onProgress(entryIndex, count);
            }
        }
        this.storeCatalog(catalog, entries, textIndex);
        return {
            entries: entries,
            textIndex: textIndex
        };
    };
    CatalogIndexer.prototype.storeCatalog = function (catalog, indexedEntries, textIndex) {
        this.persist_.saveCatalog(catalog, indexedEntries, textIndex.export())
            .then(function () {
            console.info("saved issue " + catalog.issue);
        });
    };
    CatalogIndexer.prototype.importCatalogFile = function (issue, progress) {
        var _this = this;
        if (this.api_) {
            return this.api_.index(issue, progress)
                .then(function (response) {
                var textIndex = new TextIndex();
                textIndex.import(response.textIndex);
                return { entries: response.entries, textIndex: textIndex };
            });
        }
        else {
            var urlPrefix = (location.pathname.indexOf("/workers") > -1) ? "../" : "";
            var entriesURL = urlPrefix + "data/ld" + issue + "_entries.json";
            return loadTypedJSON(entriesURL).then(function (catalog) {
                return _this.acceptCatalogData(catalog);
            });
        }
    };
    CatalogIndexer.prototype.stop = function () {
        if (this.api_) {
            this.api_.exit();
        }
    };
    return CatalogIndexer;
}());

var CatalogStore = (function () {
    function CatalogStore(state_) {
        var _this = this;
        this.state_ = state_;
        this.plasticSurge_ = new TextIndex();
        this.entryData_ = new Map();
        this.allSet_ = new Set();
        this.compoFilter_ = new Set();
        this.jamFilter_ = new Set();
        this.platformFilters_ = new Map();
        this.issueFilters_ = new Map();
        var isMobile = navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|windows phone/) !== null;
        this.persist_ = new CatalogPersistence();
        this.indexer_ = new CatalogIndexer(this.persist_, isMobile ? "local" : "worker");
        this.manifest_ = loadTypedJSON("data/manifest.json")
            .then(function (mdata) {
            mdata.issues = mdata.issues.map(function (mentry) {
                mentry.updatedAt = new Date(Date.parse(mentry.updatedAt));
                return mentry;
            });
            return mdata;
        });
        for (var pk in Platforms) {
            this.platformFilters_.set(Platforms[pk].mask, new Set());
        }
        this.filteredSet_ = new WatchableValue(new Set());
        this.loading_ = new WatchableValue(false);
        this.loadingRatio_ = new WatchableValue(0);
        state_.query.watch(function (_) { return _this.filtersChanged(); });
        state_.category.watch(function (_) { return _this.filtersChanged(); });
        state_.platform.watch(function (_) { return _this.filtersChanged(); });
        state_.issue.watch(function (issue) { return _this.issueChanged(issue); });
    }
    CatalogStore.prototype.filtersChanged = function () {
        var restrictionSets = [];
        var query = this.state_.query.get();
        var category = this.state_.category.get();
        var platform = this.state_.platform.get();
        var issue = this.state_.issue.get();
        if (query.length > 0) {
            var textFilter = this.plasticSurge_.query(query);
            if (textFilter) {
                restrictionSets.push(textFilter);
            }
        }
        if (category === "compo") {
            restrictionSets.push(this.compoFilter_);
        }
        else if (category === "jam") {
            restrictionSets.push(this.jamFilter_);
        }
        for (var pk in Platforms) {
            var plat = Platforms[pk];
            if (platform & plat.mask) {
                restrictionSets.push(this.platformFilters_.get(plat.mask));
            }
        }
        var issueSet = this.issueFilters_.get(issue);
        if (issueSet) {
            restrictionSets.push(issueSet);
        }
        var resultSet;
        if (restrictionSets.length === 0) {
            resultSet = this.allSet_;
        }
        else {
            restrictionSets.sort(function (a, b) { return a.size < b.size ? -1 : 1; });
            resultSet = new Set(restrictionSets[0]);
            for (var tisix = 1; tisix < restrictionSets.length; ++tisix) {
                resultSet = intersectSet(resultSet, restrictionSets[tisix]);
            }
        }
        this.filteredSet_.set(resultSet);
    };
    CatalogStore.prototype.issueChanged = function (newIssue) {
        var _this = this;
        this.loadingRatio_.set(0);
        this.loading_.set(true);
        var finished = function (entries, textIndex) {
            _this.acceptIndexedEntries(entries, textIndex);
            _this.loadingRatio_.set(1);
            _this.loading_.set(false);
        };
        var loadRemote = function () {
            _this.indexer_.importCatalogFile(newIssue, function (ratio) { _this.loadingRatio_.set(ratio); })
                .then(function (data) {
                finished(data.entries, data.textIndex);
            });
        };
        Promise.all([this.persist_.persistedIssues(), this.manifest_])
            .then(function (_a) {
            var headers = _a[0], manifest = _a[1];
            console.info("Local issues available: " + headers.map(function (h) { return h.issue; }));
            var local = headers.find(function (h) { return h.issue === newIssue; });
            var remote = manifest.issues.find(function (me) { return me.issue === newIssue; });
            if (local && remote) {
                if ((local.savedAt || 0) < remote.updatedAt) {
                    console.info("The server copy of issue " + newIssue + " is newer than the local copy, fall back to network load.");
                    loadRemote();
                }
                else {
                    _this.persist_.loadCatalog(newIssue)
                        .then(function (catalog) {
                        console.info("Got catalog from local DB");
                        if (catalog && catalog.header && catalog.entries && catalog.sti && catalog.entries.length === catalog.header.stats.entries) {
                            console.info("Catalog looks good, loading entries and textindex");
                            finished(catalog.entries, catalog.sti);
                        }
                        else {
                            console.info("Catalog data smelled funny, fall back to network load.");
                            loadRemote();
                        }
                    });
                }
            }
            else {
                console.info("No entries available locally, fall back to network load.");
                loadRemote();
            }
        });
    };
    CatalogStore.prototype.acceptIndexedEntries = function (entries, textIndex) {
        this.entryData_ = new Map();
        this.allSet_ = new Set();
        this.compoFilter_ = new Set();
        this.jamFilter_ = new Set();
        for (var pk in Platforms) {
            var plat = Platforms[pk];
            this.platformFilters_.set(plat.mask, new Set());
        }
        var updateIssueSet = false;
        var issueSet;
        if (entries.length > 0) {
            issueSet = this.issueFilters_.get(entries[0].ld_issue);
        }
        if (!issueSet) {
            issueSet = new Set();
            updateIssueSet = true;
        }
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            var docID = entry.docID;
            this.entryData_.set(docID, entry);
            this.allSet_.add(docID);
            if (updateIssueSet) {
                issueSet.add(docID);
            }
            for (var pk in Platforms) {
                var plat = Platforms[pk];
                if (entry.indexes.platformMask & plat.mask) {
                    this.platformFilters_.get(plat.mask).add(docID);
                }
            }
            if (entry.category === "compo") {
                this.compoFilter_.add(docID);
            }
            else {
                this.jamFilter_.add(docID);
            }
        }
        this.plasticSurge_ = new TextIndex();
        this.plasticSurge_.import(textIndex);
        this.filtersChanged();
    };
    Object.defineProperty(CatalogStore.prototype, "filteredSet", {
        get: function () { return this.filteredSet_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CatalogStore.prototype, "loading", {
        get: function () { return this.loading_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CatalogStore.prototype, "loadingRatio", {
        get: function () { return this.loadingRatio_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CatalogStore.prototype, "entries", {
        get: function () { return this.entryData_; },
        enumerable: true,
        configurable: true
    });
    CatalogStore.prototype.nukeAndPave = function () {
        this.indexer_.stop();
        return this.persist_.deleteDatabase();
    };
    return CatalogStore;
}());

var GamesBrowserState = (function () {
    function GamesBrowserState() {
        this.platformMask_ = new WatchableValue(0);
        this.category_ = new WatchableValue("");
        this.query_ = new WatchableValue("");
        this.issue_ = new WatchableValue(0);
        this.catalogStore_ = new CatalogStore(this);
    }
    Object.defineProperty(GamesBrowserState.prototype, "query", {
        get: function () { return this.query_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "category", {
        get: function () { return this.category_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "platform", {
        get: function () { return this.platformMask_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "issue", {
        get: function () { return this.issue_.watchable; },
        enumerable: true,
        configurable: true
    });
    GamesBrowserState.prototype.setQuery = function (q) {
        this.query_.set(q);
    };
    GamesBrowserState.prototype.setCategory = function (c) {
        this.category_.set(c);
    };
    GamesBrowserState.prototype.setPlatform = function (p) {
        this.platformMask_.set(p);
    };
    GamesBrowserState.prototype.setIssue = function (newIssue) {
        if (newIssue !== this.issue_.get() && (newIssue in IssueThemeNames)) {
            this.issue_.set(newIssue);
        }
    };
    GamesBrowserState.prototype.clearLocalData = function () {
        return this.catalogStore_.nukeAndPave();
    };
    Object.defineProperty(GamesBrowserState.prototype, "filteredSet", {
        get: function () { return this.catalogStore_.filteredSet; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "loading", {
        get: function () { return this.catalogStore_.loading; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "loadingRatio", {
        get: function () { return this.catalogStore_.loadingRatio; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "entries", {
        get: function () { return this.catalogStore_.entries; },
        enumerable: true,
        configurable: true
    });
    return GamesBrowserState;
}());

var GamesGrid = (function () {
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
        this.entryTemplate_ = elem("#entry");
        this.scrollOffset_ = 0;
        this.firstVisibleRow_ = 0;
        this.scrollingElem_ = containerElem_.parentElement;
        this.scrollingElem_.onscroll = function (evt) {
            _this.scrollPosChanged(evt.target.scrollTop);
        };
        state_.filteredSet.watch(function (filteredSet) {
            _this.activeSetChanged(filteredSet);
        });
        window.onresize = function () {
            _this.resized();
        };
        this.resized();
    }
    GamesGrid.prototype.activeSetChanged = function (newActiveSet) {
        this.entryCount_ = newActiveSet.size;
        this.activeList_ = arrayFromSet(newActiveSet);
        this.relayout();
    };
    GamesGrid.prototype.makeCell = function () {
        var tile = this.entryTemplate_.content.cloneNode(true).firstElementChild;
        var pills = [];
        for (var _i = 0, _a = elemList(".pills span", tile); _i < _a.length; _i++) {
            var pill = _a[_i];
            pills[parseInt(pill.dataset.mask)] = pill;
        }
        var cell = {
            tile: tile,
            link: tile.querySelector("a"),
            thumb: tile.querySelector(".thumb"),
            title: tile.querySelector("h2"),
            author: tile.querySelector("p.author span"),
            pills: pills,
            position: -1,
            docID: -1,
            hidden: false
        };
        this.containerElem_.appendChild(tile);
        return cell;
    };
    GamesGrid.prototype.pixelPositionForCellPosition = function (cellPos) {
        var cellRow = Math.floor(cellPos / this.cols_);
        var cellCol = cellPos % this.cols_;
        return {
            left: this.gridOffsetX + (cellCol * (this.cellWidth_ + this.cellMargin_)),
            top: this.gridOffsetY + (cellRow * (this.cellHeight_ + this.cellMargin_))
        };
    };
    GamesGrid.prototype.ensureCellCount = function (cellCount) {
        if (cellCount < this.cells_.length) {
            var doomed = this.cells_.splice(cellCount);
            for (var _i = 0, doomed_1 = doomed; _i < doomed_1.length; _i++) {
                var c = doomed_1[_i];
                this.containerElem_.removeChild(c.tile);
                c.position = -1;
                c.docID = -1;
            }
        }
        else {
            var position = this.cells_.length ? (this.cells_[this.cells_.length - 1].position) : -1;
            while (this.cells_.length < cellCount) {
                position += 1;
                var cell = this.makeCell();
                cell.position = position;
                this.cells_.push(cell);
            }
        }
    };
    GamesGrid.prototype.setCellPosition = function (cell, newPosition) {
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
        var docID = this.activeList_[newPosition];
        if (cell.docID !== docID) {
            cell.docID = docID;
            var entry = this.state_.entries.get(docID);
            cell.tile.dataset.docId = "" + docID;
            console.assert(entry, "No entry for docID " + docID);
            if (entry) {
                cell.link.href = entry.entry_url;
                cell.link.className = entry.category;
                cell.thumb.style.backgroundImage = entry.thumbnail_url ? "url(" + localThumbURL(entry.ld_issue, entry.thumbnail_url) + ")" : "";
                cell.title.textContent = entry.title;
                cell.author.textContent = entry.author.name;
                for (var platKey in Platforms) {
                    var plat = Platforms[platKey];
                    var entryInMask = (entry.indexes.platformMask & plat.mask) !== 0;
                    cell.pills[plat.mask].style.display = entryInMask ? "" : "none";
                }
            }
        }
    };
    GamesGrid.prototype.relayout = function () {
        this.containerElem_.style.height = (this.gridOffsetY * 2) + (Math.ceil(this.entryCount_ / this.cols_) * (this.cellHeight_ + this.cellMargin_)) + "px";
        this.scrollOffset_ = this.scrollingElem_.scrollTop;
        var effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
        var effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
        var firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
        var position = firstViewRow * this.cols_;
        for (var _i = 0, _a = this.cells_; _i < _a.length; _i++) {
            var cell = _a[_i];
            this.setCellPosition(cell, position);
            position += 1;
        }
    };
    GamesGrid.prototype.moveCells = function (cellsToMove, positionOffset) {
        for (var _i = 0, cellsToMove_1 = cellsToMove; _i < cellsToMove_1.length; _i++) {
            var cell = cellsToMove_1[_i];
            this.setCellPosition(cell, cell.position + positionOffset);
        }
    };
    GamesGrid.prototype.moveRowsDown = function (rowCount) {
        var positionOffset = this.cells_.length;
        var cellsToMove = this.cells_.splice(0, rowCount * this.cols_);
        this.moveCells(cellsToMove, positionOffset);
        this.cells_ = this.cells_.concat(cellsToMove);
        this.firstVisibleRow_ += rowCount;
    };
    GamesGrid.prototype.moveRowsUp = function (rowCount) {
        var positionOffset = -this.cells_.length;
        var cellsToMove = this.cells_.splice((this.rows_ - rowCount) * this.cols_);
        this.moveCells(cellsToMove, positionOffset);
        this.cells_ = cellsToMove.concat(this.cells_);
        this.firstVisibleRow_ -= rowCount;
    };
    GamesGrid.prototype.scrollPosChanged = function (newScrollPos) {
        this.scrollOffset_ = newScrollPos;
        var effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
        var effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
        var firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
        var rowDiff = Math.abs(firstViewRow - this.firstVisibleRow_);
        if (rowDiff >= this.rows_) {
            this.moveCells(this.cells_, (firstViewRow - this.firstVisibleRow_) * this.cols_);
            this.firstVisibleRow_ = firstViewRow;
        }
        else if (firstViewRow > this.firstVisibleRow_) {
            this.moveRowsDown(rowDiff);
        }
        else if (firstViewRow < this.firstVisibleRow_) {
            this.moveRowsUp(rowDiff);
        }
    };
    GamesGrid.prototype.dimensionsChanged = function (newCols, newRows) {
        if (this.cols_ !== newCols || this.rows_ !== newRows) {
            this.cols_ = newCols;
            this.rows_ = newRows;
            this.ensureCellCount(this.rows_ * this.cols_);
            this.relayout();
        }
        else {
            var newScrollOffset = this.scrollingElem_.scrollTop;
            if (newScrollOffset !== this.scrollOffset_) {
                this.scrollPosChanged(newScrollOffset);
            }
        }
    };
    GamesGrid.prototype.resized = function () {
        var OVERFLOW_ROWS = 6;
        var width = this.scrollingElem_.offsetWidth - this.gridOffsetX - 4;
        var height = this.scrollingElem_.offsetHeight - this.gridOffsetY;
        var cols = Math.floor(width / (this.cellWidth_ + this.cellMargin_));
        var rows = Math.ceil(height / (this.cellHeight_ + this.cellMargin_)) + OVERFLOW_ROWS;
        this.dimensionsChanged(cols, rows);
    };
    return GamesGrid;
}());

var WatchableInputBinding = (function () {
    function WatchableInputBinding(watchable_, elems_) {
        var _this = this;
        this.watchable_ = watchable_;
        this.elems_ = elems_;
        for (var _i = 0, elems_1 = elems_; _i < elems_1.length; _i++) {
            var elem = elems_1[_i];
            this.bindElement(elem);
        }
        watchable_.watch(function (newVal) {
            _this.acceptChange(newVal);
        });
    }
    WatchableInputBinding.prototype.broadcast = function (fn) {
        this.broadcastFn_ = fn;
        return this;
    };
    WatchableInputBinding.prototype.accept = function (fn) {
        this.acceptFn_ = fn;
        return this;
    };
    WatchableInputBinding.prototype.get = function (fn) {
        this.getFn_ = fn;
        return this;
    };
    WatchableInputBinding.prototype.set = function (fn) {
        this.setFn_ = fn;
        return this;
    };
    WatchableInputBinding.prototype.broadcastChange = function (newValue) {
        if (this.broadcastFn_) {
            this.broadcastFn_(newValue);
        }
    };
    WatchableInputBinding.prototype.acceptChange = function (newValue) {
        if (this.acceptFn_) {
            this.acceptFn_(newValue);
        }
        else {
            var watchableValue = String(newValue);
            for (var _i = 0, _a = this.elems_; _i < _a.length; _i++) {
                var elem = _a[_i];
                var currentValue = this.getElementValue(elem);
                if (watchableValue !== currentValue) {
                    this.setElementValue(elem, newValue);
                }
            }
        }
    };
    WatchableInputBinding.prototype.getElementValue = function (elem) {
        if (this.getFn_) {
            return String(this.getFn_(elem));
        }
        var tag = elem.nodeName.toLowerCase();
        switch (tag) {
            case "select":
            case "textarea":
                return elem.value;
            case "input": {
                var type = elem.type;
                if (type === "radio" || type === "checkbox") {
                    return elem.checked ? elem.value : undefined;
                }
                return elem.value;
            }
            default:
                return elem.textContent || "";
        }
    };
    WatchableInputBinding.prototype.setElementValue = function (elem, newValue) {
        if (this.setFn_) {
            this.setFn_(elem, newValue);
            return;
        }
        var tag = elem.nodeName.toLowerCase();
        switch (tag) {
            case "select":
            case "textarea":
                elem.value = String(newValue);
                break;
            case "input": {
                var type = elem.type;
                if (type === "radio" || type === "checkbox") {
                    elem.checked = (newValue === elem.value);
                }
                else {
                    elem.value = String(newValue);
                }
                break;
            }
            default:
                elem.textContent = String(newValue);
                break;
        }
    };
    WatchableInputBinding.prototype.bindElement = function (elem) {
        var _this = this;
        var tag = elem.nodeName.toLowerCase();
        var type = elem.type;
        var eventName;
        if (tag === "input" && (type === "radio" || type === "checkbox")) {
            eventName = "change";
        }
        else {
            eventName = "input";
        }
        elem.addEventListener(eventName, function (_) {
            var valueStr = _this.getElementValue(elem);
            if (valueStr === undefined) {
                return;
            }
            var watchableType = typeof _this.watchable_.get();
            if (watchableType === "number") {
                var value = void 0;
                value = parseFloat(valueStr);
                _this.broadcastChange(value);
            }
            else if (watchableType === "boolean") {
                var value = void 0;
                value = (valueStr === "true");
                _this.broadcastChange(value);
            }
            else if (watchableType === "string") {
                var value = void 0;
                value = valueStr;
                _this.broadcastChange(value);
            }
            else {
                console.warn("Don't know what to do with a watchable of type " + watchableType);
            }
        });
    };
    return WatchableInputBinding;
}());
function watchableBinding(w, elemOrSel, context) {
    var elems = ((typeof elemOrSel === "string")
        ? [].slice.call((context || document).querySelectorAll(elemOrSel))
        : (Array.isArray(elemOrSel) ? elemOrSel : [elemOrSel]));
    return new WatchableInputBinding(w, elems);
}

var FilterControls = (function () {
    function FilterControls(containerElem_, state_) {
        watchableBinding(state_.issue, "select[data-filter=issue]", containerElem_)
            .broadcast(function (issue) {
            state_.setIssue(issue);
            if (issue > 37) {
                state_.setPlatform(0);
            }
            elem("select[data-filter=platform]").disabled = issue > 37;
        });
        watchableBinding(state_.category, "input[name=category]", containerElem_)
            .broadcast(function (category) { state_.setCategory(category); });
        watchableBinding(state_.platform, "select[data-filter=platform]", containerElem_)
            .broadcast(function (platform) { state_.setPlatform(platform); });
        watchableBinding(state_.query, "#terms", containerElem_)
            .broadcast(function (query) { state_.setQuery(query); });
        state_.loading.watch(function (loading) {
            if (!loading) {
                elem("#terms").focus();
                elem("select[data-filter=platform]").disabled = state_.issue.get() > 37;
            }
        });
    }
    return FilterControls;
}());

var LoadingWall = (function () {
    function LoadingWall(containerElem_, state_) {
        var hideTimer_ = -1;
        state_.loading.watch(function (loading) {
            if (loading) {
                if (hideTimer_ > -1) {
                    clearTimeout(hideTimer_);
                    hideTimer_ = -1;
                }
                containerElem_.style.display = "block";
                containerElem_.classList.add("active");
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            }
            else {
                containerElem_.classList.remove("active");
                hideTimer_ = window.setTimeout(function () { containerElem_.style.display = "none"; }, 500);
            }
        });
        watchableBinding(state_.loadingRatio, ".bar .progress", containerElem_)
            .get(function (el) { return parseInt(el.style.width || "0") / 100; })
            .set(function (el, ratio) { el.style.width = Math.round(ratio * 100) + "%"; });
    }
    return LoadingWall;
}());

var state = new GamesBrowserState();
function reset() {
    console.info("Deleting local data, please wait, this can take a while...");
    elemList("select").forEach(function (e) { return e.disabled = true; });
    elem("#smokedglass").style.display = "block";
    elem(".status").style.display = "none";
    elem("#smokedglass").classList.add("active");
    state.clearLocalData().then(function () { console.info("Local database deleted, when you reload the page a new database will be created."); }, function (err) { console.warn("Could not delete local database. Error:", err); });
}
document.addEventListener("DOMContentLoaded", function (_) {
    new GamesGrid(elem(".entries"), state);
    new FilterControls(elem(".filters"), state);
    new LoadingWall(elem("#smokedglass"), state);
    state.setIssue(38);
    console.info("Hi! If you ever need to delete all local data cached by DTBB just run: `dtbb.reset()` in your console while on this page. Have fun!");
});

exports.state = state;
exports.reset = reset;

}((this.dtbb = this.dtbb || {})));
