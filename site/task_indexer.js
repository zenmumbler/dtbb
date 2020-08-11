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

    const DB_NAME = "dtbb";
    class CatalogPersistence {
        constructor() {
            this.db_ = new PromisedDB(DB_NAME, 1, (db, _oldVersion, _newVersion) => {
                console.info("Creating stores and indexes...");
                const headers = db.createObjectStore("headers", { keyPath: "issue" });
                const textindexes = db.createObjectStore("textindexes", { keyPath: "issue" });
                const entries = db.createObjectStore("entries", { keyPath: "docID" });
                headers.createIndex("issue", "issue", { unique: true });
                textindexes.createIndex("issue", "issue", { unique: true });
                entries.createIndex("issue", "ld_issue");
            });
        }
        saveCatalog(catalog, indEntries, sti) {
            const header = {
                issue: catalog.issue,
                theme: catalog.theme,
                stats: catalog.stats,
                savedAt: new Date()
            };
            return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", (tr, { timeout }) => {
                console.info(`Storing issue ${header.issue} with ${indEntries.length} entries and textindex`);
                timeout(10000);
                const headers = tr.objectStore("headers");
                const entries = tr.objectStore("entries");
                const textindexes = tr.objectStore("textindexes");
                headers.put(header);
                const textIndex = {
                    issue: catalog.issue,
                    data: sti
                };
                textindexes.put(textIndex);
                for (const entry of indEntries) {
                    entries.put(entry);
                }
            })
                .catch(error => {
                console.warn(`Error saving catalog ${catalog.issue}`, error);
                throw error;
            });
        }
        saveCatalogTextIndex(issue, sti) {
            const data = {
                issue,
                data: sti
            };
            return this.db_.transaction("textindexes", "readwrite", (tr, {}) => {
                const textindexes = tr.objectStore("textindexes");
                textindexes.put(data);
            })
                .catch(error => {
                console.warn("Error saving textindex: ", error);
                throw error;
            });
        }
        persistedIssues() {
            return this.db_.transaction("headers", "readonly", (tr, { getAll }) => {
                const issueIndex = tr.objectStore("headers").index("issue");
                return getAll(issueIndex, undefined, "nextunique");
            })
                .catch(() => []);
        }
        loadCatalog(issue) {
            return this.db_.transaction(["headers", "entries", "textindexes"], "readonly", (tr, { request, getAll, timeout }) => {
                timeout(5000);
                const headerP = request(tr.objectStore("headers").get(issue));
                const issueIndex = tr.objectStore("entries").index("issue");
                const entriesP = getAll(issueIndex, issue);
                const ptiP = request(tr.objectStore("textindexes").get(issue));
                return Promise.all([headerP, entriesP, ptiP])
                    .then((result) => {
                    const pti = result[2];
                    return {
                        header: result[0],
                        entries: result[1],
                        sti: pti && pti.data
                    };
                });
            })
                .catch(() => null);
        }
        destroyCatalog(issue) {
            return this.db_.transaction(["entries"], "readonly", (tr, { getAllKeys }) => {
                const issueIndex = tr.objectStore("entries").index("issue");
                return getAllKeys(issueIndex, issue);
            })
                .then(entryKeys => {
                return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", (tr, {}) => {
                    const headers = tr.objectStore("headers");
                    const entries = tr.objectStore("entries");
                    const indexes = tr.objectStore("textindexes");
                    if (entryKeys.length > 0) {
                        const range = IDBKeyRange.bound(entryKeys[0], entryKeys[entryKeys.length - 1]);
                        entries.delete(range);
                    }
                    headers.delete(issue);
                    indexes.delete(issue);
                });
            });
        }
        purgeAllData() {
            return this.db_.transaction(["headers", "entries", "textindexes"], "readwrite", (tr, {}) => {
                const headers = tr.objectStore("headers");
                const entries = tr.objectStore("entries");
                const indexes = tr.objectStore("textindexes");
                headers.clear();
                entries.clear();
                indexes.clear();
            });
        }
        deleteDatabase() {
            this.db_.close();
            return new Promise((resolve, reject) => {
                const req = indexedDB.deleteDatabase(DB_NAME);
                req.onerror = (err) => { reject(err); };
                req.onsuccess = () => { resolve(); };
            });
        }
    }

    function loadTypedJSON(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.overrideMimeType("application/json");
            xhr.responseType = "json";
            xhr.onload = function () {
                resolve(xhr.response);
            };
            xhr.onerror = reject;
            xhr.send();
        });
    }

    function intersectSet(a, b) {
        const intersection = new Set();
        let tiny;
        let large;
        if (a.size < b.size) {
            [tiny, large] = [a, b];
        }
        else {
            [tiny, large] = [b, a];
        }
        tiny.forEach(val => {
            if (large.has(val)) {
                intersection.add(val);
            }
        });
        return intersection;
    }
    function mergeSet(dest, source) {
        if (source && source.forEach) {
            source.forEach(val => dest.add(val));
        }
    }
    function newSetFromArray(source) {
        const set = new Set();
        const len = source.length;
        for (let vi = 0; vi < len; ++vi) {
            set.add(source[vi]);
        }
        return set;
    }

    const DiacriticCharMapping = {
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
    const InvalidCharsMatcher = /[^a-zA-Z0-9ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/g;
    const DiacriticsMatcher = /[ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/;
    const DiacriticCharMatchers = {};
    Object.keys(DiacriticCharMapping).forEach(c => DiacriticCharMatchers[c] = new RegExp(c, "g"));
    class TextIndex {
        constructor() {
            this.data_ = new Map();
            this.wordNGramCache_ = new Map();
            this.MIN_NGRAM_LENGTH = 2;
            this.MAX_NGRAM_LENGTH = 12;
            this.collapsedPunctuationMatcher = /['-]/g;
            this.multipleSpacesMatcher = / +/g;
        }
        export() {
            const json = {};
            this.data_.forEach((indexes, key) => {
                const flatIndexes = [];
                indexes.forEach(index => flatIndexes.push(index));
                json[key] = flatIndexes;
            });
            return json;
        }
        import(index) {
            if (index instanceof TextIndex) {
                index.data_.forEach((indexes, key) => {
                    if (this.data_.has(key)) {
                        mergeSet(this.data_.get(key), indexes);
                    }
                    else {
                        this.data_.set(key, indexes);
                    }
                });
            }
            else {
                for (const key in index) {
                    if (this.data_.has(key)) {
                        mergeSet(this.data_.get(key), index[key]);
                    }
                    else {
                        this.data_.set(key, newSetFromArray(index[key]));
                    }
                }
            }
        }
        get ngramCount() {
            return this.data_.size;
        }
        wordNGrams(word) {
            if (this.wordNGramCache_.has(word)) {
                return this.wordNGramCache_.get(word);
            }
            const wordLen = word.length;
            const ngrams = new Set();
            for (let l = this.MIN_NGRAM_LENGTH; l <= this.MAX_NGRAM_LENGTH; ++l) {
                if (l > wordLen) {
                    break;
                }
                const maxO = wordLen - l;
                for (let o = 0; o <= maxO; ++o) {
                    const ss = word.substr(o, l);
                    if (!ngrams.has(ss)) {
                        ngrams.add(ss);
                    }
                }
            }
            this.wordNGramCache_.set(word, ngrams);
            return ngrams;
        }
        stripDiacritics(term) {
            let r;
            while (r = term.match(DiacriticsMatcher)) {
                const mc = term[r.index];
                term = term.replace(DiacriticCharMatchers[mc], DiacriticCharMapping[mc]);
            }
            return term;
        }
        tokenizeString(s) {
            const cs = s.toLowerCase().replace(this.collapsedPunctuationMatcher, "").replace(InvalidCharsMatcher, " ").replace(this.multipleSpacesMatcher, " ").trim();
            const tokens = cs.split(" ");
            return newSetFromArray(tokens);
        }
        indexRawString(rs, ref) {
            const boxedRef = [ref];
            const tokenSet = this.tokenizeString(rs);
            tokenSet.forEach(token => {
                token = this.stripDiacritics(token);
                const ngrams = this.wordNGrams(token);
                ngrams.forEach(ngram => {
                    if (!this.data_.has(ngram)) {
                        this.data_.set(ngram, newSetFromArray(boxedRef));
                    }
                    else {
                        this.data_.get(ngram).add(ref);
                    }
                });
            });
        }
        query(qs) {
            const qt = this.tokenizeString(qs);
            const termIndexSets = [];
            let hasEmptyResult = false;
            qt.forEach(term => {
                if (term.length < this.MIN_NGRAM_LENGTH) {
                    return;
                }
                if (term.length > this.MAX_NGRAM_LENGTH) {
                    term = term.substr(0, this.MAX_NGRAM_LENGTH);
                }
                term = this.stripDiacritics(term);
                if (this.data_.has(term)) {
                    termIndexSets.push(this.data_.get(term));
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
            termIndexSets.sort((a, b) => a.size < b.size ? -1 : 1);
            let result = new Set(termIndexSets[0]);
            for (let tisix = 1; tisix < termIndexSets.length; ++tisix) {
                result = intersectSet(result, termIndexSets[tisix]);
            }
            return result;
        }
    }

    function makePlatformLookup(plats) {
        const pl = {};
        let shift = 0;
        for (const p of plats) {
            pl[p.key] = {
                key: p.key,
                label: p.label,
                mask: 1 << shift
            };
            shift += 1;
        }
        return pl;
    }
    const Platforms = makePlatformLookup([
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
        return keys.reduce((mask, key) => {
            const plat = Platforms[key];
            return mask | (plat ? plat.mask : 0);
        }, 0);
    }

    class IndexerAPI {
        constructor() {
            this.promFuncs_ = new Map();
            this.nextIndex_ = 0;
            this.worker_ = new Worker("task_indexer.js");
            this.worker_.onerror = event => {
                console.warn(`An internal error occurred inside the indexer task: ${event.error} @ ${event.lineno}:${event.colno}`);
            };
            this.worker_.onmessage = event => {
                const response = event.data;
                if (response && typeof response.status === "string" && typeof response.reqIndex === "number") {
                    const funcs = this.promFuncs_.get(response.reqIndex);
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
                            this.promFuncs_.delete(response.reqIndex);
                        }
                    }
                    else {
                        console.warn(`IndexerAPI: Cannot find the functions for request #${response.reqIndex}`);
                    }
                }
                else {
                    console.warn(`IndexerAPI: Got an invalid response from the server: ${response}`);
                }
            };
        }
        promisedCall(req, progress) {
            return new Promise((resolve, reject) => {
                this.promFuncs_.set(req.reqIndex, { resolve: resolve, reject, progress });
                this.worker_.postMessage(req);
            });
        }
        open() {
            this.nextIndex_ += 1;
            const req = {
                what: "open",
                reqIndex: this.nextIndex_
            };
            return this.promisedCall(req);
        }
        index(issue, progress) {
            this.nextIndex_ += 1;
            const req = {
                what: "index",
                reqIndex: this.nextIndex_,
                issue
            };
            return this.promisedCall(req, progress);
        }
        exit() {
            this.worker_.terminate();
        }
    }

    function makeDocID(issue, entryIndex) {
        return (issue << 16) | entryIndex;
    }
    class CatalogIndexer {
        constructor(persist_, mode) {
            this.persist_ = persist_;
            if (mode === "worker") {
                this.api_ = new IndexerAPI();
                this.api_.open().catch(() => {
                    console.warn("Got a failure when trying to connect to Indexer API, disabling");
                    this.api_ = undefined;
                });
            }
        }
        acceptCatalogData(catalog) {
            const entries = catalog.entries.map(entry => {
                const indEntry = entry;
                indEntry.indexes = {
                    platformMask: 0
                };
                return indEntry;
            });
            const count = entries.length;
            const textIndex = new TextIndex();
            for (let entryIndex = 0; entryIndex < count; ++entryIndex) {
                const entry = entries[entryIndex];
                const docID = makeDocID(catalog.issue, entryIndex);
                entry.docID = docID;
                entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);
                textIndex.indexRawString(entry.title, docID);
                textIndex.indexRawString(entry.author.name, docID);
                textIndex.indexRawString(entry.description, docID);
                for (const link of entry.links) {
                    textIndex.indexRawString(link.label, docID);
                }
                if (this.onProgress) {
                    this.onProgress(entryIndex, count);
                }
            }
            this.storeCatalog(catalog, entries, textIndex);
            return {
                entries,
                textIndex
            };
        }
        storeCatalog(catalog, indexedEntries, textIndex) {
            this.persist_.saveCatalog(catalog, indexedEntries, textIndex.export())
                .then(() => {
                console.info(`saved issue ${catalog.issue}`);
            });
        }
        importCatalogFile(issue, progress) {
            if (this.api_) {
                return this.api_.index(issue, progress)
                    .then(response => {
                    const textIndex = new TextIndex();
                    textIndex.import(response.textIndex);
                    return { entries: response.entries, textIndex };
                });
            }
            else {
                const urlPrefix = (location.pathname.indexOf("/workers") > -1) ? "../" : "";
                const entriesURL = `${urlPrefix}data/ld${issue}_entries.json?d={Date.now()}`;
                return loadTypedJSON(entriesURL).then(catalog => {
                    return this.acceptCatalogData(catalog);
                });
            }
        }
        stop() {
            if (this.api_) {
                this.api_.exit();
            }
        }
    }

    let db;
    function postResponse(r) {
        postMessage(r);
    }
    onmessage = (evt) => {
        const req = evt.data;
        const error = function (message) {
            postResponse({
                status: "error",
                reqIndex: (req && ("reqIndex" in req)) ? req.reqIndex : null,
                message
            });
        };
        if (typeof req === "object" && "what" in req) {
            if (req.what === "open") {
                if (db === undefined) {
                    db = new CatalogPersistence();
                    postResponse({ status: "success", reqIndex: req.reqIndex });
                }
                else {
                    error("Redundant open request");
                }
            }
            else if (req.what === "index") {
                if (db !== undefined) {
                    if (typeof req.issue === "number" && req.issue >= 15 && req.issue <= 50) {
                        const indexer = new CatalogIndexer(db, "local");
                        indexer.onProgress = function (completed, total) {
                            if (completed % 100 === 0) {
                                postResponse({
                                    status: "status",
                                    reqIndex: req.reqIndex,
                                    progress: completed / total
                                });
                            }
                        };
                        indexer.importCatalogFile(req.issue).then(data => {
                            postResponse({
                                status: "success",
                                reqIndex: req.reqIndex,
                                entries: data.entries,
                                textIndex: data.textIndex.export()
                            });
                        });
                    }
                    else {
                        error(`Invalid issue number: ${req.issue}`);
                    }
                }
                else {
                    error("Got an index request without active database.");
                }
            }
            else {
                error(`Unknown request type ${req.what}`);
            }
        }
        else {
            error("Invalid request structure sent to worker: " + JSON.stringify(req));
        }
    };

}());
