(function (exports) {
'use strict';

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
function elem(sel, base) {
    if (base === void 0) { base = document; }
    return (base.querySelector(sel));
}
function elemList(sel, base) {
    if (base === void 0) { base = document; }
    return ([].slice.call(base.querySelectorAll(sel), 0));
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
    37: "?",
};

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
    TextIndex.prototype.save = function () {
        var json = {};
        this.data_.forEach(function (indexes, key) {
            var flatIndexes = [];
            indexes.forEach(function (index) { return flatIndexes.push(index); });
            json[key] = flatIndexes;
        });
        return json;
    };
    TextIndex.prototype.load = function (sti) {
        this.data_ = new Map();
        for (var key in sti) {
            this.data_.set(key, newSetFromArray(sti[key]));
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

var PromiseDB = (function () {
    function PromiseDB(name, version, upgrade) {
        if (version === void 0) { version = 1; }
        this.db_ = this.request(indexedDB.open(name, version), function (openReq) {
            openReq.onupgradeneeded = function (upgradeEvt) {
                var db = openReq.result;
                upgrade(db, upgradeEvt.oldVersion, upgradeEvt.newVersion || version);
            };
        });
        this.tctx_ = {
            request: this.request.bind(this),
            cursor: this.cursor.bind(this),
            keyCursor: this.keyCursor.bind(this)
        };
    }
    PromiseDB.prototype.transaction = function (storeNames, mode, fn) {
        var _this = this;
        return this.db_.then(function (db) {
            return new Promise(function (resolve, reject) {
                var tr = db.transaction(storeNames, mode);
                tr.onerror = function (_) { reject(tr.error ? tr.error.toString() : "transaction failed"); };
                tr.onabort = function (_) { reject("aborted"); };
                tr.oncomplete = function (_) { resolve(tr); };
                fn(tr, _this.tctx_);
            });
        });
    };
    PromiseDB.prototype.request = function (req, fn) {
        var reqProm = new Promise(function (resolve, reject) {
            req.onerror = function () { reject(req.error.toString()); };
            req.onsuccess = function () { resolve(req.result); };
            if (fn) {
                fn(req);
            }
        });
        return this.db_ ? this.db_.then(function (_) { return reqProm; }) : reqProm;
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
    Object.defineProperty(PromiseDB.prototype, "idb", {
        get: function () { return this.db_; },
        enumerable: true,
        configurable: true
    });
    return PromiseDB;
}());

function makeDocID(issue, entryIndex) {
    return (issue << 16) | entryIndex;
}
var CatalogPersistence = (function () {
    function CatalogPersistence() {
        this.db_ = new PromiseDB("dtbb", 1, function (db, _oldVersion, _newVersion) {
            db.createObjectStore("entries", { keyPath: "docID" });
        });
    }
    CatalogPersistence.prototype.saveEntries = function (entries) {
        return this.db_.transaction("entries", "readwrite", function (tr, _a) {
            var request = _a.request;
            var store = tr.objectStore("entries");
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var entry = entries_1[_i];
                request(store.add(entry)).catch(function (err) { console.warn("Could not save entry", err); });
            }
        });
    };
    CatalogPersistence.prototype.enumEntries = function () {
        this.db_.transaction("entries", "readonly", function (tr, _a) {
            var cursor = _a.cursor;
            var store = tr.objectStore("entries");
            cursor(store)
                .next(function (cur) {
                console.info("entry");
                cur.continue();
            })
                .complete(function () {
                console.info("done");
            });
        });
    };
    return CatalogPersistence;
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
        this.persist_ = new CatalogPersistence();
        for (var pk in Platforms) {
            this.platformFilters_.set(Platforms[pk].mask, new Set());
        }
        this.filteredSet_ = new WatchableValue(new Set());
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
        if (restrictionSets.length == 0) {
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
        this.loadCatalog(newIssue);
    };
    CatalogStore.prototype.storeCatalog = function (_catalog, indexedEntries) {
        this.persist_.saveEntries(indexedEntries).then(function () { console.info("saved 'em!"); });
    };
    CatalogStore.prototype.acceptCatalogData = function (catalog) {
        var entries = catalog.entries.map(function (entry) {
            var indEntry = entry;
            indEntry.indexes = {
                platformMask: 0
            };
            return indEntry;
        });
        var count = entries.length;
        var t0 = performance.now();
        for (var entryIndex = 0; entryIndex < count; ++entryIndex) {
            var docID = makeDocID(catalog.issue, entryIndex);
            this.allSet_.add(docID);
            var entry = entries[entryIndex];
            entry.docID = docID;
            entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);
            var issueSet = this.issueFilters_.get(entry.ld_issue);
            if (!issueSet) {
                issueSet = new Set();
                this.issueFilters_.set(entry.ld_issue, issueSet);
            }
            issueSet.add(docID);
            this.entryData_.set(docID, entry);
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
            this.plasticSurge_.indexRawString(entry.title, docID);
            this.plasticSurge_.indexRawString(entry.author.name, docID);
            this.plasticSurge_.indexRawString(entry.description, docID);
            for (var _i = 0, _a = entry.links; _i < _a.length; _i++) {
                var link = _a[_i];
                this.plasticSurge_.indexRawString(link.label, docID);
            }
        }
        var t1 = performance.now();
        console.info("Text Indexing took " + (t1 - t0).toFixed(1) + "ms");
        this.storeCatalog(catalog, entries);
        this.filtersChanged();
    };
    CatalogStore.prototype.loadCatalog = function (issue) {
        var _this = this;
        var revision = 1;
        var extension = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
        var entriesURL = "data/ld" + issue + "_entries" + extension + "?" + revision;
        return loadTypedJSON(entriesURL).then(function (catalog) {
            _this.acceptCatalogData(catalog);
        });
    };
    Object.defineProperty(CatalogStore.prototype, "filteredSet", {
        get: function () { return this.filteredSet_.watchable; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CatalogStore.prototype, "entries", {
        get: function () { return this.entryData_; },
        enumerable: true,
        configurable: true
    });
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
    Object.defineProperty(GamesBrowserState.prototype, "filteredSet", {
        get: function () { return this.catalogStore_.filteredSet; },
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
        if (cell.docID != docID) {
            cell.docID = docID;
            var entry = this.state_.entries.get(docID);
            cell.tile.dataset["docId"] = "" + docID;
            console.assert(entry, "No entry for docID " + docID);
            if (entry) {
                cell.link.href = entry.entry_url;
                cell.link.className = entry.category;
                cell.thumb.style.backgroundImage = "url(" + entry.thumbnail_url + ")";
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
        for (var c = 0; c < cellsToMove.length; ++c) {
            var cell = cellsToMove[c];
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
        if (this.cols_ != newCols || this.rows_ != newRows) {
            this.cols_ = newCols;
            this.rows_ = newRows;
            this.ensureCellCount(this.rows_ * this.cols_);
            this.relayout();
        }
        else {
            var newScrollOffset = this.scrollingElem_.scrollTop;
            if (newScrollOffset != this.scrollOffset_) {
                this.scrollPosChanged(newScrollOffset);
            }
        }
    };
    GamesGrid.prototype.resized = function () {
        var OVERFLOW_ROWS = 1;
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
        var tag = elem.nodeName.toLowerCase();
        switch (tag) {
            case "select":
            case "textarea":
                elem.value = String(newValue);
                break;
            case "input": {
                var type = elem.type;
                if (type === "radio" || type === "checkbox") {
                    elem.checked = (newValue == elem.value);
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
                value = parseInt(valueStr);
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
            .broadcast(function (issue) { state_.setIssue(issue); });
        watchableBinding(state_.category, "input[name=category]", containerElem_)
            .broadcast(function (category) { state_.setCategory(category); });
        watchableBinding(state_.platform, "select[data-filter=platform]", containerElem_)
            .broadcast(function (platform) { state_.setPlatform(platform); });
        watchableBinding(state_.query, "#terms", containerElem_)
            .broadcast(function (query) { state_.setQuery(query); });
    }
    return FilterControls;
}());

var state = new GamesBrowserState();
document.addEventListener("DOMContentLoaded", function (_) {
    new GamesGrid(elem(".entries"), state);
    new FilterControls(elem(".filters"), state);
    state.setIssue(36);
});

exports.state = state;

}((this.dtbb = this.dtbb || {})));
