(function () {
'use strict';

var PromiseDB = (function () {
    function PromiseDB(name, version, upgrade) {
        this.db_ = this.request(indexedDB.open(name, version), function (openReq) {
            openReq.onupgradeneeded = function (upgradeEvt) {
                var db = openReq.result;
                upgrade(db, upgradeEvt.oldVersion, upgradeEvt.newVersion || version);
            };
        })
            .catch(function (error) {
            console.warn("Failed to open / upgrade database '" + name + "'", error);
        });
        this.tctx_ = {
            request: this.request.bind(this),
            cursor: this.cursor.bind(this),
            keyCursor: this.keyCursor.bind(this),
            getAll: this.getAll.bind(this),
            getAllKeys: this.getAllKeys.bind(this)
        };
    }
    PromiseDB.prototype.close = function () {
        this.db_.then(function (db) {
            db.close();
        });
    };
    PromiseDB.prototype.transaction = function (storeNames, mode, fn) {
        var _this = this;
        return this.db_.then(function (db) {
            return new Promise(function (resolve, reject) {
                var tr = db.transaction(storeNames, mode);
                tr.onerror = function () { reject(tr.error || "transaction failed"); };
                tr.onabort = function () { reject("aborted"); };
                var result = fn(tr, _this.tctx_);
                tr.oncomplete = function () { resolve((result === undefined) ? undefined : result); };
            });
        });
    };
    PromiseDB.prototype.request = function (req, fn) {
        var reqProm = new Promise(function (resolve, reject) {
            req.onerror = function () { reject(req.error || "request failed"); };
            req.onsuccess = function () { resolve(req.result); };
            if (fn) {
                fn(req);
            }
        });
        return this.db_ ? this.db_.then(function () { return reqProm; }) : reqProm;
    };
    PromiseDB.prototype.cursorImpl = function (cursorReq) {
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
    PromiseDB.prototype.cursor = function (container, range, direction) {
        var cursorReq = container.openCursor(range, direction);
        return this.cursorImpl(cursorReq);
    };
    PromiseDB.prototype.keyCursor = function (index, range, direction) {
        var cursorReq = index.openKeyCursor(range, direction);
        return this.cursorImpl(cursorReq);
    };
    PromiseDB.prototype.getAll = function (container, range, direction, limit) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var result = [];
            _this.cursor(container, range, direction)
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
    PromiseDB.prototype.getAllKeys = function (container, range, direction, limit) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var result = [];
            _this.keyCursor(container, range, direction)
                .next(function (cur) {
                result.push(cur.key);
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
    return PromiseDB;
}());

var CatalogPersistence = (function () {
    function CatalogPersistence() {
        this.db_ = new PromiseDB("dtbb", 1, function (db, _oldVersion, _newVersion) {
            console.info("Creating stores and indexes...");
            var headers = db.createObjectStore("headers", { keyPath: "issue" });
            var textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
            var entries = db.createObjectStore("entries", { keyPath: "docID" });
            headers.createIndex("issue", "issue", { unique: true });
            textindexes.createIndex("issue", "issue", { unique: true });
            entries.createIndex("issue", "ld_issue");
            entries.createIndex("category", "category");
            entries.createIndex("platform", "platforms", { multiEntry: true });
        });
    }
    CatalogPersistence.prototype.saveCatalog = function (catalog, indEntries, sti) {
        var header = {
            issue: catalog.issue,
            theme: catalog.theme,
            stats: catalog.stats
        };
        return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", function (tr, _a) {
            var request = _a.request;
            console.info("Storing issue " + header.issue + " with " + indEntries.length + " entries and textindex");
            var headers = tr.objectStore("headers");
            var entries = tr.objectStore("entries");
            var textindexes = tr.objectStore("textindexes");
            request(headers.put(header));
            var textIndex = {
                issue: catalog.issue,
                data: sti
            };
            request(textindexes.put(textIndex));
            for (var _i = 0, indEntries_1 = indEntries; _i < indEntries_1.length; _i++) {
                var entry = indEntries_1[_i];
                request(entries.put(entry));
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
            var request = _a.request;
            var textindexes = tr.objectStore("textindexes");
            request(textindexes.put(data));
        })
            .catch(function (error) {
            console.warn("Error saving textindex: ", error);
            throw error;
        });
    };
    CatalogPersistence.prototype.persistedIssues = function () {
        return this.db_.transaction("headers", "readonly", function (tr, _a) {
            var getAllKeys = _a.getAllKeys;
            var issueIndex = tr.objectStore("headers").index("issue");
            return getAllKeys(issueIndex, undefined, "nextunique");
        })
            .catch(function () { return []; });
    };
    CatalogPersistence.prototype.loadCatalog = function (issue) {
        return this.db_.transaction(["headers", "entries", "textindexes"], "readonly", function (tr, _a) {
            var request = _a.request, getAll = _a.getAll;
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
        return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", function (tr, _a) {
            var request = _a.request, getAllKeys = _a.getAllKeys;
            var headers = tr.objectStore("headers");
            var entries = tr.objectStore("entries");
            var issueIndex = entries.index("issue");
            var indexes = tr.objectStore("textindexes");
            getAllKeys(issueIndex, issue)
                .then(function (entryKeys) {
                for (var _i = 0, entryKeys_1 = entryKeys; _i < entryKeys_1.length; _i++) {
                    var key = entryKeys_1[_i];
                    request(entries.delete(key));
                }
            });
            request(headers.delete(issue));
            request(indexes.delete(issue));
        });
    };
    return CatalogPersistence;
}());

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

var IndexerAPI = (function () {
    function IndexerAPI() {
        var _this = this;
        this.promFuncs_ = new Map();
        this.nextIndex_ = 0;
        this.worker_ = new Worker("workers/task_indexer.js");
        this.worker_.onerror = function (event) {
            console.warn("An internal error occurred inside the indexer task: " + event.error + " @ " + event.lineno + ":" + event.colno);
        };
        this.worker_.onmessage = function (event) {
            var response = event.data;
            if (response && typeof response.status === "string" && typeof response.reqIndex === "number") {
                var funcs = _this.promFuncs_.get(response.reqIndex);
                if (funcs) {
                    console.info("IndexerAPI: received valid response for request #" + response.reqIndex, response);
                    if (response.status === "success") {
                        funcs.resolve(response);
                    }
                    else {
                        funcs.reject(response);
                    }
                    _this.promFuncs_.delete(response.reqIndex);
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
    IndexerAPI.prototype.promisedCall = function (req) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.promFuncs_.set(req.reqIndex, { resolve: resolve, reject: reject });
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
    IndexerAPI.prototype.index = function (issue) {
        this.nextIndex_ += 1;
        var req = {
            what: "index",
            reqIndex: this.nextIndex_,
            issue: issue
        };
        return this.promisedCall(req);
    };
    return IndexerAPI;
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
    source.forEach(function (val) { return dest.add(val); });
}
function newSetFromArray(source) {
    var set = new Set();
    var len = source.length;
    for (var vi = 0; vi < len; ++vi) {
        set.add(source[vi]);
    }
    return set;
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
        if (termIndexSets.length == 0) {
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
    CatalogIndexer.prototype.importCatalogFile = function (issue) {
        var _this = this;
        if (this.api_) {
            return this.api_.index(issue).then(function (response) {
                var textIndex = new TextIndex();
                textIndex.import(response.textIndex);
                return { entries: response.entries, textIndex: textIndex };
            });
        }
        else {
            var revision = 1;
            var extension = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
            var entriesURL = "data/ld" + issue + "_entries" + extension + "?" + revision;
            if (location.pathname.indexOf("/workers") > -1) {
                entriesURL = "../" + entriesURL;
            }
            return loadTypedJSON(entriesURL).then(function (catalog) {
                return _this.acceptCatalogData(catalog);
            });
        }
    };
    return CatalogIndexer;
}());

var db;
var indexer;
self.onmessage = function (evt) {
    var req = evt.data;
    var error = function (message) {
        postMessage({
            status: "error",
            reqIndex: (req && ("reqIndex" in req)) ? req.reqIndex : null,
            message: message
        });
    };
    if (typeof req === "object" && "what" in req) {
        if (req.what === "open") {
            if (db === undefined) {
                db = new CatalogPersistence();
                indexer = new CatalogIndexer(db, "local");
                postMessage({ status: "success", reqIndex: req.reqIndex });
            }
            else {
                error("Redundant open request");
            }
        }
        else if (req.what === "index") {
            if (indexer !== undefined) {
                if (typeof req.issue === "number" && req.issue >= 15 && req.issue <= 40) {
                    indexer.importCatalogFile(req.issue).then(function (data) {
                        postMessage({
                            status: "success",
                            reqIndex: req.reqIndex,
                            entries: data.entries,
                            textIndex: data.textIndex.export()
                        });
                    });
                }
                else {
                    error("Invalid issue number: " + req.issue);
                }
            }
            else {
                error("Got an index request without active database.");
            }
        }
        else {
            error("Unknown request type " + req.what);
        }
    }
    else {
        error("Invalid request structure sent to worker: " + JSON.stringify(req));
    }
};

}());
