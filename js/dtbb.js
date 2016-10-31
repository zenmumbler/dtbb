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

var Watchable = (function () {
    function Watchable(initial) {
        this.watchers_ = [];
        this.purgeableWatchers_ = [];
        this.notifying_ = false;
        this.value_ = initial;
    }
    Watchable.prototype.watch = function (watcher) {
        if (this.watchers_.indexOf(watcher) === -1) {
            this.watchers_.push(watcher);
        }
    };
    Watchable.prototype.unwatch = function (watcher) {
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
    Watchable.prototype.notify = function () {
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
    Watchable.prototype.get = function () { return this.value_; };
    Watchable.prototype.set = function (newValue) {
        this.value_ = newValue;
        this.notify();
    };
    Watchable.prototype.changed = function () {
        this.notify();
    };
    return Watchable;
}());

var allSet = new Set();
var compoFilter = new Set();
var jamFilter = new Set();
var filterSets = new Map();
for (var pk in Platforms) {
    filterSets.set(Platforms[pk].mask, new Set());
}
function makeDocID(issue, entryIndex) {
    return (issue << 16) | entryIndex;
}
var GamesBrowserState = (function () {
    function GamesBrowserState() {
        this.plasticSurge_ = new TextIndex();
        this.platformMask_ = 0;
        this.category_ = "";
        this.query_ = "";
        this.filteredSet_ = new Watchable(new Set());
        this.entryData_ = [];
    }
    GamesBrowserState.prototype.filtersChanged = function () {
        var restrictionSets = [];
        if (this.query_.length > 0) {
            var textFilter = this.plasticSurge_.query(this.query_);
            if (textFilter) {
                restrictionSets.push(textFilter);
            }
        }
        if (this.category_ === "compo") {
            restrictionSets.push(compoFilter);
        }
        else if (this.category_ === "jam") {
            restrictionSets.push(jamFilter);
        }
        for (var pk in Platforms) {
            var plat = Platforms[pk];
            if (this.platformMask_ & plat.mask) {
                restrictionSets.push(filterSets.get(plat.mask));
            }
        }
        var resultSet;
        if (restrictionSets.length == 0) {
            resultSet = allSet;
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
    GamesBrowserState.prototype.acceptCatalogData = function (catalog) {
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
            allSet.add(docID);
            var entry = entries[entryIndex];
            entry.indexes.platformMask = maskForPlatformKeys(entry.platforms);
            this.entryData_[docID] = entry;
            for (var pk in Platforms) {
                var plat = Platforms[pk];
                if (entry.indexes.platformMask & plat.mask) {
                    filterSets.get(plat.mask).add(docID);
                }
            }
            if (entry.category === "compo") {
                compoFilter.add(docID);
            }
            else {
                jamFilter.add(docID);
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
    };
    Object.defineProperty(GamesBrowserState.prototype, "query", {
        get: function () { return this.query_; },
        set: function (q) {
            this.query_ = q;
            this.filtersChanged();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "category", {
        get: function () { return this.category_; },
        set: function (c) {
            this.category_ = c;
            this.filtersChanged();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "platform", {
        get: function () { return this.platformMask_; },
        set: function (p) {
            this.platformMask_ = p;
            this.filtersChanged();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "filteredSet", {
        get: function () { return this.filteredSet_; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "entries", {
        get: function () { return this.entryData_; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GamesBrowserState.prototype, "allSet", {
        get: function () { return allSet; },
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
        this.entryCount_ = state_.allSet.size;
        this.activeList_ = arrayFromSet(state_.allSet);
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
            contentIndex: -1,
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
                c.contentIndex = -1;
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
            for (var platKey in Platforms) {
                var plat = Platforms[platKey];
                var entryInMask = (entry.indexes.platformMask & plat.mask) !== 0;
                cell.pills[plat.mask].style.display = entryInMask ? "" : "none";
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

var FilterControls = (function () {
    function FilterControls(containerElem_, state_) {
        var searchControl = elem("#terms", containerElem_);
        searchControl.oninput = function (_) {
            state_.query = searchControl.value;
        };
        var categoryControls = elemList("input[name=category]", containerElem_);
        for (var _i = 0, categoryControls_1 = categoryControls; _i < categoryControls_1.length; _i++) {
            var cc = categoryControls_1[_i];
            cc.onchange = function (evt) {
                var ctrl = evt.target;
                if (ctrl.checked) {
                    state_.category = ctrl.value;
                }
            };
        }
        var platformSelect = elem("select", containerElem_);
        platformSelect.onchange = function (evt) {
            var ctrl = evt.target;
            state_.platform = parseInt(ctrl.value);
        };
        searchControl.focus();
    }
    return FilterControls;
}());

var DATA_REVISION = 1;
var DATA_EXTENSION = location.host.toLowerCase() !== "zenmumbler.net" ? ".json" : ".gzjson";
var ENTRIES_URL = "data/ld36_entries" + DATA_EXTENSION + "?" + DATA_REVISION;
var state = new GamesBrowserState();
loadTypedJSON(ENTRIES_URL).then(function (catalog) {
    state.acceptCatalogData(catalog);
    (elem(".pleasehold")).style.display = "none";
    new GamesGrid(elem(".entries"), state);
    new FilterControls(elem(".filters"), state);
});

exports.state = state;

}((this.dtbb = this.dtbb || {})));
