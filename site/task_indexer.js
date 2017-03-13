(function () {
'use strict';

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

var db;
onmessage = function (evt) {
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
                postMessage({ status: "success", reqIndex: req.reqIndex });
            }
            else {
                error("Redundant open request");
            }
        }
        else if (req.what === "index") {
            if (db !== undefined) {
                if (typeof req.issue === "number" && req.issue >= 15 && req.issue <= 40) {
                    var indexer = new CatalogIndexer(db, "local");
                    indexer.onProgress = function (completed, total) {
                        if (completed % 100 === 0) {
                            postMessage({
                                status: "status",
                                reqIndex: req.reqIndex,
                                progress: completed / total
                            });
                        }
                    };
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
