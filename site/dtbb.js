var dtbb = (function (exports) {
    'use strict';

    function elem(sel, base = document) {
        return base.querySelector(sel);
    }
    function elemList(sel, base = document) {
        return [].slice.call(base.querySelectorAll(sel), 0);
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
    const IssueThemeNames = {
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
        38: "A Small World",
        39: "Running out of Power",
        40: "The more you have, the worse it is",
        41: "Two Incompatible Genres",
        42: "Running out of Space",
        43: "Sacrifices must be made",
        44: "Your life is currency",
        45: "Start with nothing",
        46: "Keep it alive"
    };
    function localThumbURL(issue, ldThumbURL) {
        const fileName = ldThumbURL.split("/").splice(-1);
        return `data/thumbs/${issue}/${fileName}`;
    }

    class WatchableValue {
        constructor(initial) {
            this.watchers_ = [];
            this.purgeableWatchers_ = [];
            this.notifying_ = false;
            this.value_ = initial;
        }
        watch(watcher) {
            if (this.watchers_.indexOf(watcher) === -1) {
                this.watchers_.push(watcher);
            }
        }
        unwatch(watcher) {
            const watcherIndex = this.watchers_.indexOf(watcher);
            if (watcherIndex !== -1) {
                if (this.notifying_) {
                    this.purgeableWatchers_.push(watcher);
                }
                else {
                    this.watchers_.splice(watcherIndex, 1);
                }
            }
        }
        notify() {
            this.notifying_ = true;
            this.purgeableWatchers_ = [];
            for (const w of this.watchers_) {
                w(this.value_);
            }
            this.notifying_ = false;
            for (const pw of this.purgeableWatchers_) {
                this.unwatch(pw);
            }
        }
        get() { return this.value_; }
        set(newValue) {
            this.value_ = newValue;
            this.notify();
        }
        changed() {
            this.notify();
        }
        get watchable() { return this; }
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
    function arrayFromSet(source) {
        const arr = [];
        source.forEach(val => arr.push(val));
        return arr;
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

    class CatalogStore {
        constructor(state_) {
            this.state_ = state_;
            this.plasticSurge_ = new TextIndex();
            this.entryData_ = new Map();
            this.allSet_ = new Set();
            this.compoFilter_ = new Set();
            this.jamFilter_ = new Set();
            this.platformFilters_ = new Map();
            this.issueFilters_ = new Map();
            const isMobile = navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|windows phone/) !== null;
            this.persist_ = new CatalogPersistence();
            this.indexer_ = new CatalogIndexer(this.persist_, isMobile ? "local" : "worker");
            this.manifest_ = loadTypedJSON("data/manifest.json")
                .then(mdata => {
                mdata.issues = mdata.issues.map(mentry => {
                    mentry.updatedAt = new Date(Date.parse(mentry.updatedAt));
                    return mentry;
                });
                return mdata;
            });
            for (const pk in Platforms) {
                this.platformFilters_.set(Platforms[pk].mask, new Set());
            }
            this.filteredSet_ = new WatchableValue(new Set());
            this.loading_ = new WatchableValue(false);
            this.loadingRatio_ = new WatchableValue(0);
            state_.query.watch(_ => this.filtersChanged());
            state_.category.watch(_ => this.filtersChanged());
            state_.platform.watch(_ => this.filtersChanged());
            state_.issue.watch(issue => this.issueChanged(issue));
        }
        filtersChanged() {
            const restrictionSets = [];
            const query = this.state_.query.get();
            const category = this.state_.category.get();
            const platform = this.state_.platform.get();
            const issue = this.state_.issue.get();
            if (query.length > 0) {
                const textFilter = this.plasticSurge_.query(query);
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
            for (const pk in Platforms) {
                const plat = Platforms[pk];
                if (platform & plat.mask) {
                    restrictionSets.push(this.platformFilters_.get(plat.mask));
                }
            }
            const issueSet = this.issueFilters_.get(issue);
            if (issueSet) {
                restrictionSets.push(issueSet);
            }
            let resultSet;
            if (restrictionSets.length === 0) {
                resultSet = this.allSet_;
            }
            else {
                restrictionSets.sort((a, b) => a.size < b.size ? -1 : 1);
                resultSet = new Set(restrictionSets[0]);
                for (let tisix = 1; tisix < restrictionSets.length; ++tisix) {
                    resultSet = intersectSet(resultSet, restrictionSets[tisix]);
                }
            }
            this.filteredSet_.set(resultSet);
        }
        issueChanged(newIssue) {
            this.loadingRatio_.set(0);
            this.loading_.set(true);
            const finished = (entries, textIndex) => {
                this.acceptIndexedEntries(entries, textIndex);
                this.loadingRatio_.set(1);
                this.loading_.set(false);
            };
            const loadRemote = () => {
                this.indexer_.importCatalogFile(newIssue, ratio => { this.loadingRatio_.set(ratio); })
                    .then(data => {
                    finished(data.entries, data.textIndex);
                });
            };
            Promise.all([this.persist_.persistedIssues(), this.manifest_])
                .then(([headers, manifest]) => {
                console.info(`Local issues available: ${headers.map(h => h.issue)}`);
                const local = headers.find(h => h.issue === newIssue);
                const remote = manifest.issues.find(me => me.issue === newIssue);
                if (local && remote) {
                    if ((local.savedAt || 0) < remote.updatedAt) {
                        console.info(`The server copy of issue ${newIssue} is newer than the local copy, fall back to network load.`);
                        loadRemote();
                    }
                    else {
                        this.persist_.loadCatalog(newIssue)
                            .then(catalog => {
                            console.info(`Got catalog from local DB`);
                            if (catalog && catalog.header && catalog.entries && catalog.sti && catalog.entries.length === catalog.header.stats.entries) {
                                console.info(`Catalog looks good, loading entries and textindex`);
                                finished(catalog.entries, catalog.sti);
                            }
                            else {
                                console.info(`Catalog data smelled funny, fall back to network load.`);
                                loadRemote();
                            }
                        });
                    }
                }
                else {
                    console.info(`No entries available locally, fall back to network load.`);
                    loadRemote();
                }
            });
        }
        acceptIndexedEntries(entries, textIndex) {
            this.entryData_ = new Map();
            this.allSet_ = new Set();
            this.compoFilter_ = new Set();
            this.jamFilter_ = new Set();
            for (const pk in Platforms) {
                const plat = Platforms[pk];
                this.platformFilters_.set(plat.mask, new Set());
            }
            let updateIssueSet = false;
            let issueSet;
            if (entries.length > 0) {
                issueSet = this.issueFilters_.get(entries[0].ld_issue);
            }
            if (!issueSet) {
                issueSet = new Set();
                updateIssueSet = true;
            }
            for (const entry of entries) {
                const docID = entry.docID;
                this.entryData_.set(docID, entry);
                this.allSet_.add(docID);
                if (updateIssueSet) {
                    issueSet.add(docID);
                }
                for (const pk in Platforms) {
                    const plat = Platforms[pk];
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
        }
        get filteredSet() { return this.filteredSet_.watchable; }
        get loading() { return this.loading_.watchable; }
        get loadingRatio() { return this.loadingRatio_.watchable; }
        get entries() { return this.entryData_; }
        nukeAndPave() {
            this.indexer_.stop();
            return this.persist_.deleteDatabase();
        }
    }

    class GamesBrowserState {
        constructor() {
            this.platformMask_ = new WatchableValue(0);
            this.category_ = new WatchableValue("");
            this.query_ = new WatchableValue("");
            this.issue_ = new WatchableValue(0);
            this.catalogStore_ = new CatalogStore(this);
        }
        get query() { return this.query_.watchable; }
        get category() { return this.category_.watchable; }
        get platform() { return this.platformMask_.watchable; }
        get issue() { return this.issue_.watchable; }
        setQuery(q) {
            this.query_.set(q);
        }
        setCategory(c) {
            this.category_.set(c);
        }
        setPlatform(p) {
            this.platformMask_.set(p);
        }
        setIssue(newIssue) {
            if (newIssue !== this.issue_.get() && (newIssue in IssueThemeNames)) {
                this.issue_.set(newIssue);
            }
        }
        clearLocalData() {
            return this.catalogStore_.nukeAndPave();
        }
        get filteredSet() { return this.catalogStore_.filteredSet; }
        get loading() { return this.catalogStore_.loading; }
        get loadingRatio() { return this.catalogStore_.loadingRatio; }
        get entries() { return this.catalogStore_.entries; }
    }

    class GamesGrid {
        constructor(containerElem_, state_) {
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
            this.scrollingElem_.onscroll = (evt) => {
                this.scrollPosChanged(evt.target.scrollTop);
            };
            state_.filteredSet.watch(filteredSet => {
                this.activeSetChanged(filteredSet);
            });
            window.onresize = () => {
                this.resized();
            };
            this.resized();
        }
        activeSetChanged(newActiveSet) {
            this.entryCount_ = newActiveSet.size;
            this.activeList_ = arrayFromSet(newActiveSet);
            this.relayout();
        }
        makeCell() {
            const tile = this.entryTemplate_.content.cloneNode(true).firstElementChild;
            const pills = [];
            for (const pill of elemList(".pills span", tile)) {
                pills[parseInt(pill.dataset.mask)] = pill;
            }
            const cell = {
                tile,
                link: tile.querySelector("a"),
                thumb: tile.querySelector(".thumb"),
                title: tile.querySelector("h2"),
                author: tile.querySelector("p.author span"),
                pills,
                position: -1,
                docID: -1,
                hidden: false
            };
            this.containerElem_.appendChild(tile);
            return cell;
        }
        pixelPositionForCellPosition(cellPos) {
            const cellRow = Math.floor(cellPos / this.cols_);
            const cellCol = cellPos % this.cols_;
            return {
                left: this.gridOffsetX + (cellCol * (this.cellWidth_ + this.cellMargin_)),
                top: this.gridOffsetY + (cellRow * (this.cellHeight_ + this.cellMargin_))
            };
        }
        ensureCellCount(cellCount) {
            if (cellCount < this.cells_.length) {
                const doomed = this.cells_.splice(cellCount);
                for (const c of doomed) {
                    this.containerElem_.removeChild(c.tile);
                    c.position = -1;
                    c.docID = -1;
                }
            }
            else {
                let position = this.cells_.length ? (this.cells_[this.cells_.length - 1].position) : -1;
                while (this.cells_.length < cellCount) {
                    position += 1;
                    const cell = this.makeCell();
                    cell.position = position;
                    this.cells_.push(cell);
                }
            }
        }
        setCellPosition(cell, newPosition) {
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
            const cellPixelPos = this.pixelPositionForCellPosition(newPosition);
            cell.tile.style.left = cellPixelPos.left + "px";
            cell.tile.style.top = cellPixelPos.top + "px";
            const docID = this.activeList_[newPosition];
            if (cell.docID !== docID) {
                cell.docID = docID;
                const entry = this.state_.entries.get(docID);
                cell.tile.dataset.docId = "" + docID;
                console.assert(entry, `No entry for docID ${docID}`);
                if (entry) {
                    cell.link.href = entry.entry_url;
                    cell.link.className = entry.category;
                    cell.thumb.style.backgroundImage = entry.thumbnail_url ? "url(" + localThumbURL(entry.ld_issue, entry.thumbnail_url) + ")" : "";
                    cell.title.textContent = entry.title;
                    cell.author.textContent = entry.author.name;
                    for (const platKey in Platforms) {
                        const plat = Platforms[platKey];
                        const entryInMask = (entry.indexes.platformMask & plat.mask) !== 0;
                        cell.pills[plat.mask].style.display = entryInMask ? "" : "none";
                    }
                }
            }
        }
        relayout() {
            this.containerElem_.style.height = (this.gridOffsetY * 2) + (Math.ceil(this.entryCount_ / this.cols_) * (this.cellHeight_ + this.cellMargin_)) + "px";
            this.scrollOffset_ = this.scrollingElem_.scrollTop;
            const effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
            const effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
            const firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
            let position = firstViewRow * this.cols_;
            for (const cell of this.cells_) {
                this.setCellPosition(cell, position);
                position += 1;
            }
        }
        moveCells(cellsToMove, positionOffset) {
            for (const cell of cellsToMove) {
                this.setCellPosition(cell, cell.position + positionOffset);
            }
        }
        moveRowsDown(rowCount) {
            const positionOffset = this.cells_.length;
            const cellsToMove = this.cells_.splice(0, rowCount * this.cols_);
            this.moveCells(cellsToMove, positionOffset);
            this.cells_ = this.cells_.concat(cellsToMove);
            this.firstVisibleRow_ += rowCount;
        }
        moveRowsUp(rowCount) {
            const positionOffset = -this.cells_.length;
            const cellsToMove = this.cells_.splice((this.rows_ - rowCount) * this.cols_);
            this.moveCells(cellsToMove, positionOffset);
            this.cells_ = cellsToMove.concat(this.cells_);
            this.firstVisibleRow_ -= rowCount;
        }
        scrollPosChanged(newScrollPos) {
            this.scrollOffset_ = newScrollPos;
            const effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
            const effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
            const firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
            const rowDiff = Math.abs(firstViewRow - this.firstVisibleRow_);
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
        }
        dimensionsChanged(newCols, newRows) {
            if (this.cols_ !== newCols || this.rows_ !== newRows) {
                this.cols_ = newCols;
                this.rows_ = newRows;
                this.ensureCellCount(this.rows_ * this.cols_);
                this.relayout();
            }
            else {
                const newScrollOffset = this.scrollingElem_.scrollTop;
                if (newScrollOffset !== this.scrollOffset_) {
                    this.scrollPosChanged(newScrollOffset);
                }
            }
        }
        resized() {
            const OVERFLOW_ROWS = 6;
            const width = this.scrollingElem_.offsetWidth - this.gridOffsetX - 4;
            const height = this.scrollingElem_.offsetHeight - this.gridOffsetY;
            const cols = Math.floor(width / (this.cellWidth_ + this.cellMargin_));
            const rows = Math.ceil(height / (this.cellHeight_ + this.cellMargin_)) + OVERFLOW_ROWS;
            this.dimensionsChanged(cols, rows);
        }
    }

    class WatchableInputBinding {
        constructor(watchable_, elems_) {
            this.watchable_ = watchable_;
            this.elems_ = elems_;
            for (const elem of elems_) {
                this.bindElement(elem);
            }
            watchable_.watch(newVal => {
                this.acceptChange(newVal);
            });
        }
        broadcast(fn) {
            this.broadcastFn_ = fn;
            return this;
        }
        accept(fn) {
            this.acceptFn_ = fn;
            return this;
        }
        get(fn) {
            this.getFn_ = fn;
            return this;
        }
        set(fn) {
            this.setFn_ = fn;
            return this;
        }
        broadcastChange(newValue) {
            if (this.broadcastFn_) {
                this.broadcastFn_(newValue);
            }
        }
        acceptChange(newValue) {
            if (this.acceptFn_) {
                this.acceptFn_(newValue);
            }
            else {
                const watchableValue = String(newValue);
                for (const elem of this.elems_) {
                    const currentValue = this.getElementValue(elem);
                    if (watchableValue !== currentValue) {
                        this.setElementValue(elem, newValue);
                    }
                }
            }
        }
        getElementValue(elem) {
            if (this.getFn_) {
                return String(this.getFn_(elem));
            }
            const tag = elem.nodeName.toLowerCase();
            switch (tag) {
                case "select":
                case "textarea":
                    return elem.value;
                case "input": {
                    const type = elem.type;
                    if (type === "radio" || type === "checkbox") {
                        return elem.checked ? elem.value : undefined;
                    }
                    return elem.value;
                }
                default:
                    return elem.textContent || "";
            }
        }
        setElementValue(elem, newValue) {
            if (this.setFn_) {
                this.setFn_(elem, newValue);
                return;
            }
            const tag = elem.nodeName.toLowerCase();
            switch (tag) {
                case "select":
                case "textarea":
                    elem.value = String(newValue);
                    break;
                case "input": {
                    const type = elem.type;
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
        }
        bindElement(elem) {
            const tag = elem.nodeName.toLowerCase();
            const type = elem.type;
            let eventName;
            if (tag === "input" && (type === "radio" || type === "checkbox")) {
                eventName = "change";
            }
            else {
                eventName = "input";
            }
            elem.addEventListener(eventName, _ => {
                const valueStr = this.getElementValue(elem);
                if (valueStr === undefined) {
                    return;
                }
                const watchableType = typeof this.watchable_.get();
                if (watchableType === "number") {
                    let value;
                    value = parseFloat(valueStr);
                    this.broadcastChange(value);
                }
                else if (watchableType === "boolean") {
                    let value;
                    value = (valueStr === "true");
                    this.broadcastChange(value);
                }
                else if (watchableType === "string") {
                    let value;
                    value = valueStr;
                    this.broadcastChange(value);
                }
                else {
                    console.warn(`Don't know what to do with a watchable of type ${watchableType}`);
                }
            });
        }
    }
    function watchableBinding(w, elemOrSel, context) {
        const elems = ((typeof elemOrSel === "string")
            ? [].slice.call((context || document).querySelectorAll(elemOrSel))
            : (Array.isArray(elemOrSel) ? elemOrSel : [elemOrSel]));
        return new WatchableInputBinding(w, elems);
    }

    class FilterControls {
        constructor(containerElem_, state_) {
            watchableBinding(state_.issue, "select[data-filter=issue]", containerElem_)
                .broadcast(issue => {
                state_.setIssue(issue);
                if (issue === 38) {
                    state_.setPlatform(0);
                }
                elem("select[data-filter=platform]").disabled = issue > 37;
            });
            watchableBinding(state_.category, "input[name=category]", containerElem_)
                .broadcast(category => { state_.setCategory(category); });
            watchableBinding(state_.platform, "select[data-filter=platform]", containerElem_)
                .broadcast(platform => { state_.setPlatform(platform); });
            watchableBinding(state_.query, "#terms", containerElem_)
                .broadcast(query => { state_.setQuery(query); });
            state_.loading.watch(loading => {
                if (!loading) {
                    elem("#terms").focus();
                    elem("select[data-filter=platform]").disabled = state_.issue.get() === 38;
                }
            });
        }
    }

    class LoadingWall {
        constructor(containerElem_, state_) {
            let hideTimer_ = -1;
            state_.loading.watch(loading => {
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
                    hideTimer_ = window.setTimeout(() => { containerElem_.style.display = "none"; }, 500);
                }
            });
            watchableBinding(state_.loadingRatio, ".bar .progress", containerElem_)
                .get(el => parseInt(el.style.width || "0") / 100)
                .set((el, ratio) => { el.style.width = `${Math.round(ratio * 100)}%`; });
        }
    }

    const state = new GamesBrowserState();
    function reset() {
        console.info("Deleting local data, please wait, this can take a while...");
        elemList("select").forEach(e => e.disabled = true);
        elem("#smokedglass").style.display = "block";
        elem(".status").style.display = "none";
        elem("#smokedglass").classList.add("active");
        state.clearLocalData().then(() => { console.info("Local database deleted, when you reload the page a new database will be created."); }, (err) => { console.warn("Could not delete local database. Error:", err); });
    }
    document.addEventListener("DOMContentLoaded", _ => {
        new GamesGrid(elem(".entries"), state);
        new FilterControls(elem(".filters"), state);
        new LoadingWall(elem("#smokedglass"), state);
        state.setIssue(46);
        console.info("Hi! If you ever need to delete all local data cached by DTBB just run: `dtbb.reset()` in your console while on this page. Have fun!");
    });

    exports.reset = reset;
    exports.state = state;

    return exports;

}({}));
