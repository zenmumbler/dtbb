'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var request = _interopDefault(require('request'));
var mkdirp = _interopDefault(require('mkdirp'));
var jsdom = require('jsdom');

function listingDirPath() {
    return "./spider_data/listings/";
}
function listingPath(issue) {
    return listingDirPath() + "listing_" + issue + ".json";
}
function thumbsDirPath(issue) {
    return "../site/data/thumbs/" + issue + "/";
}
function localThumbPathForLDURL(issue, ldThumb) {
    var fileName = ldThumb.split("/").splice(-1);
    return thumbsDirPath(issue) + fileName;
}
function entryPagesDirPath(issue) {
    return "./spider_data/entry_pages/entries_" + issue + "/";
}
function entryPageFilePath(issue, uid) {
    return entryPagesDirPath(issue) + "entry_" + uid + ".html";
}
function entriesCatalogPath(issue) {
    return "../site/data/ld" + issue + "_entries.json";
}
function issueBaseURL(issue) {
    return "http://ludumdare.com/compo/ludum-dare-" + issue + "/";
}
function ensureDirectory(dir) {
    return new Promise(function (resolve, reject) {
        mkdirp(dir, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
function timeoutPromise(delayMS) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delayMS);
    });
}

var LD_PAGE_SIZE = 24;
var DELAY_BETWEEN_REQUESTS_MS = 20;
function next(state) {
    return new Promise(function (resolve, reject) {
        request(issueBaseURL(state.issue) + "/?action=preview&start=" + state.offset, function (error, response, body) {
            var completed = false;
            if (!error && response.statusCode === 200) {
                var links = body.match(/\?action=preview&(amp;)?uid=(\d+)/g);
                var thumbs = body.match(/http:\/\/ludumdare.com\/compo\/wp\-content\/compo2\/thumb\/[^\.]+\.jpg/g);
                if (links && thumbs) {
                    if (links.length === thumbs.length + 1) {
                        links.shift();
                    }
                    if (links.length === thumbs.length) {
                        state.allLinks = state.allLinks.concat(links);
                        state.allThumbs = state.allThumbs.concat(thumbs);
                    }
                    else {
                        reject("mismatch of link and thumb count (" + links.length + " vs " + thumbs.length + ") at offset " + state.offset);
                        return;
                    }
                }
                else {
                    completed = true;
                }
            }
            else {
                reject("Failed to get page for offset " + state.offset + ", status: " + response.statusCode + ", error: " + error);
                return;
            }
            if (!completed) {
                state.offset += LD_PAGE_SIZE;
                console.info("fetched " + state.allLinks.length + " records...");
                resolve(timeoutPromise(DELAY_BETWEEN_REQUESTS_MS).then(function (_) { return next(state); }));
            }
            else {
                console.info("Writing listing (" + state.allLinks.length + " entries)...");
                var listingJSON_1 = JSON.stringify({ links: state.allLinks, thumbs: state.allThumbs });
                ensureDirectory(listingDirPath()).then(function () {
                    fs.writeFile(listingPath(state.issue), listingJSON_1, function (err) {
                        if (err) {
                            console.error("Failed to write listing file", err);
                        }
                        else {
                            console.info("Done.");
                            resolve();
                        }
                    });
                });
            }
        });
    });
}
function fetchListing(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Fetching listing for issue " + issue);
    return next({
        issue: issue,
        offset: 0,
        allLinks: [],
        allThumbs: []
    });
}

var DELAY_BETWEEN_REQUESTS_MS$1 = 50;
function load(state) {
    if (state.index >= state.urlList.length) {
        console.info("Done (wrote " + state.entriesWritten + " entries, " + state.failures + " failures)");
        return Promise.resolve();
    }
    var link = state.urlList[state.index];
    var uid = parseInt(link.substr(link.indexOf("uid=") + 4));
    var filePath = entryPageFilePath(state.issue, uid);
    var next = function (overrideDelay) {
        if (state.index % 10 === 0) {
            console.info((100 * (state.index / state.urlList.length)).toFixed(1) + "%");
        }
        state.index += 1;
        return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS$1)
            .then(function (_) { return load(state); });
    };
    if (fs.existsSync(filePath)) {
        return next(1);
    }
    else {
        return new Promise(function (resolve) {
            request({
                url: link,
                timeout: 3000
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    fs.writeFile(filePath, body, function (err) {
                        if (err) {
                            console.info("Failed to write file for uid: " + uid, err);
                            state.failures += 1;
                        }
                        else {
                            state.entriesWritten += 1;
                        }
                        resolve(next());
                    });
                }
                else {
                    console.info("Failed to load entry page for uid: " + uid, error, response ? response.statusCode : "-");
                    state.failures += 1;
                    resolve(next());
                }
            });
        });
    }
}
function fetchEntryPages(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Fetching entry pages for issue " + issue);
    return new Promise(function (resolve, reject) {
        fs.readFile(listingPath(issue), "utf8", function (listingErr, data) {
            if (listingErr) {
                reject("Could not load listing for issue " + issue + ": " + listingErr);
                return;
            }
            resolve(ensureDirectory(entryPagesDirPath(issue))
                .then(function () {
                var baseURL = issueBaseURL(issue);
                var json = JSON.parse(data);
                var links = json.links.map(function (u) { return baseURL + u; });
                return load({
                    issue: issue,
                    index: 0,
                    urlList: links,
                    entriesWritten: 0,
                    failures: 0
                });
            })
                .catch(function (dirErr) {
                reject("Could not create entries directory: " + dirErr);
            }));
        });
    });
}

var DELAY_BETWEEN_REQUESTS_MS$2 = 10;
function load$1(state) {
    if (state.index >= state.urlList.length) {
        console.info("Done (wrote " + state.thumbsWritten + " thumbs, " + state.failures + " failures)");
        return Promise.resolve();
    }
    var url = state.urlList[state.index];
    var localPath = localThumbPathForLDURL(state.issue, url);
    var next = function (overrideDelay) {
        if (state.index % 10 === 0) {
            console.info((100 * (state.index / state.urlList.length)).toFixed(1) + "%");
        }
        state.index += 1;
        return timeoutPromise(overrideDelay || DELAY_BETWEEN_REQUESTS_MS$2)
            .then(function (_) { return load$1(state); });
    };
    if (fs.existsSync(localPath)) {
        return next(1);
    }
    else {
        return new Promise(function (resolve) {
            request({
                url: url,
                encoding: null,
                timeout: 3000
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    fs.writeFile(localPath, body, function (err) {
                        if (err) {
                            console.info("Failed to write thumb: " + localPath, err);
                            state.failures += 1;
                        }
                        else {
                            state.thumbsWritten += 1;
                        }
                        resolve(next());
                    });
                }
                else {
                    console.info("Failed to load thumb " + url, error, response ? response.statusCode : "-");
                    state.failures += 1;
                    resolve(next());
                }
            });
        });
    }
}
function fetchThumbs(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Fetching thumbs for issue " + issue);
    return new Promise(function (resolve, reject) {
        fs.readFile(listingPath(issue), "utf8", function (listingErr, data) {
            if (listingErr) {
                reject("Could not load listing for issue " + issue + ": " + listingErr);
                return;
            }
            return (ensureDirectory(thumbsDirPath(issue))
                .then(function () {
                var json = JSON.parse(data);
                resolve(load$1({
                    issue: issue,
                    index: 0,
                    urlList: json.thumbs,
                    thumbsWritten: 0,
                    failures: 0
                }));
            })
                .catch(function (dirErr) {
                reject("Could not create thumbs directory: " + dirErr);
            }));
        });
    });
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
function arrayFromSet(source) {
    var arr = [];
    source.forEach(function (val) { return arr.push(val); });
    return arr;
}

function termify(text) {
    return text
        .toLowerCase()
        .replace(/os.x/g, "osx")
        .replace(/[\(\)\/\.\n\r\*\?\-]/g, " ")
        .replace(/ +/g, " ")
        .trim()
        .split(" ")
        .map(function (term) {
        return term
            .replace("lve", "love")
            .replace(",", "")
            .replace(/^mac$/, "osx");
    });
}
function pks(keys) {
    return newSetFromArray(keys);
}
var linkPlatformMapping = {
    download: pks(["desktop"]),
    love: pks(["win", "mac", "linux", "desktop"]),
    love2d: pks(["win", "mac", "linux", "desktop"]),
    standalone: pks(["desktop"]),
    win: pks(["win", "desktop"]),
    win32: pks(["win", "desktop"]),
    windows32: pks(["win", "desktop"]),
    win64: pks(["win", "desktop"]),
    windows64: pks(["win", "desktop"]),
    windows: pks(["win", "desktop"]),
    exe: pks(["win", "desktop"]),
    osx: pks(["mac", "desktop"]),
    macos: pks(["mac", "desktop"]),
    linux: pks(["linux", "desktop"]),
    ubuntu: pks(["linux", "desktop"]),
    web: pks(["web"]),
    html5: pks(["web"]),
    chrome: pks(["web"]),
    browser: pks(["web"]),
    firefox: pks(["web"]),
    safari: pks(["web"]),
    webgl: pks(["web"]),
    online: pks(["web"]),
    webplayer: pks(["web"]),
    newgrounds: pks(["web"]),
    java: pks(["java"]),
    java7: pks(["java"]),
    java8: pks(["java"]),
    jar: pks(["java"]),
    flash: pks(["web"]),
    swf: pks(["web"]),
    vr: pks(["vr"]),
    oculus: pks(["vr"]),
    vive: pks(["vr"]),
    cardboard: pks(["vr"]),
    android: pks(["mobile"]),
    apk: pks(["mobile"]),
    ios: pks(["mobile"]),
};
var descriptionPlatformMapping = {
    exe: pks(["win", "desktop"]),
    love2d: pks(["win", "mac", "linux", "desktop"]),
    html5: pks(["web"]),
    chrome: pks(["web"]),
    firefox: pks(["web"]),
    safari: pks(["web"]),
    java: pks(["java", "desktop"]),
    jar: pks(["java", "desktop"]),
    flash: pks(["web"]),
    swf: pks(["web"]),
    vr: pks(["vr"]),
    oculus: pks(["vr"]),
    vive: pks(["vr"]),
    cardboard: pks(["vr"]),
};
function detectPlatforms(entry) {
    var plats = new Set();
    var descTerms = termify(entry.description);
    var urlTerms = entry.links
        .map(function (link) {
        return termify(link.label)
            .concat(termify(link.url));
    })
        .reduce(function (ta, tn) { return ta.concat(tn); }, []);
    for (var _i = 0, urlTerms_1 = urlTerms; _i < urlTerms_1.length; _i++) {
        var term = urlTerms_1[_i];
        var lks = linkPlatformMapping[term];
        if (lks) {
            mergeSet(plats, lks);
        }
    }
    for (var _a = 0, descTerms_1 = descTerms; _a < descTerms_1.length; _a++) {
        var term = descTerms_1[_a];
        var dks = descriptionPlatformMapping[term];
        if (dks) {
            mergeSet(plats, dks);
        }
    }
    if (plats.size === 0) {
        if ((urlTerms.indexOf("itch") > -1) ||
            (descTerms.indexOf("wasd") > -1) ||
            (descTerms.indexOf("awsd") > -1) ||
            (descTerms.indexOf("aswd") > -1)) {
            plats.add("desktop");
        }
    }
    if (plats.has("java")) {
        plats.delete("win");
        plats.delete("mac");
        plats.delete("linux");
    }
    return plats;
}

function entryDoc(issue, uid) {
    return new Promise(function (resolve, reject) {
        jsdom.env(entryPageFilePath(issue, uid), function (errors, window) {
            if (errors && errors.length) {
                reject(errors);
            }
            else {
                resolve(window.document);
            }
        });
    });
}
function loadCatalog(issue) {
    return new Promise(function (resolve, reject) {
        fs.readFile(listingPath(issue), "utf8", function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                var listingJSON = JSON.parse(data);
                resolve(listingJSON);
            }
        });
    });
}
function extractRatings(table) {
    var ratings = [];
    if (table) {
        var trs = [].slice.call(table.querySelectorAll("tr"));
        for (var _i = 0, trs_1 = trs; _i < trs_1.length; _i++) {
            var row = trs_1[_i];
            var tds = row.querySelectorAll("td");
            if (tds.length !== 3) {
                console.info("weird rating table found");
                break;
            }
            var rank = -1;
            var rankString = tds[0].innerHTML.trim();
            var simpleRank = rankString.match(/#(\d+)/);
            if (simpleRank) {
                rank = parseInt(simpleRank[1]);
            }
            else if (rankString.indexOf("ibronze") > -1) {
                rank = 3;
            }
            else if (rankString.indexOf("isilver") > -1) {
                rank = 2;
            }
            else if (rankString.indexOf("igold") > -1) {
                rank = 1;
            }
            var area = (tds[1].innerHTML.trim().toLowerCase().replace("(jam)", ""));
            var score = parseFloat(tds[2].innerHTML.trim());
            if (rank > -1 && area.length > 0 && !isNaN(score)) {
                ratings.push({ area: area, rank: rank, score: score });
            }
        }
    }
    return ratings;
}
function createEntry(relURI, issue, uid, thumbImg, doc) {
    var ldBaseURL = "http://ludumdare.com/compo/";
    var eventBaseURL = issueBaseURL(issue);
    var base = doc.querySelector("#compo2");
    if (!base) {
        throw new Error("no base element in page of uid: " + uid);
    }
    var titleElem = base.querySelector("h2");
    var avatarImg = base.querySelector("img.avatar");
    var authorLink = titleElem && titleElem.parentElement.querySelector("a");
    var categoryText = (titleElem && titleElem.parentElement.querySelector("i").textContent) || "";
    var authorName = (authorLink && authorLink.querySelector("strong").textContent) || "";
    var screensArrayElem = base.querySelector(".shot-nav");
    var screensArray = [].slice.call((screensArrayElem && screensArrayElem.querySelectorAll("img")) || []);
    var linksArray = [].slice.call(base.querySelectorAll(".links a"));
    var description = screensArrayElem && screensArrayElem.nextSibling.textContent || "";
    var ratingTable = base.querySelector("table");
    if ([titleElem, avatarImg, authorLink, categoryText, authorName, screensArrayElem].some(function (t) { return t == null; })) {
        throw new Error("can't get all relevant elements from page source of uid " + uid);
    }
    var categoryStr = categoryText.split(" ")[0].toLowerCase().replace("competition", "compo");
    var entry = {
        ld_issue: issue,
        title: titleElem.textContent || "<no title>",
        category: categoryStr.indexOf("jam") > -1 ? "jam" : "compo",
        description: description,
        thumbnail_url: thumbImg,
        entry_url: eventBaseURL + relURI,
        author: {
            name: authorName,
            uid: uid,
            avatar_url: avatarImg.src,
            home_url: ldBaseURL + authorLink.getAttribute("href").substr(3)
        },
        screens: screensArray.map(function (screen) {
            var imgoc = screen.getAttribute("onclick");
            var urls = { thumbnail_url: "", full_url: "" };
            if (imgoc) {
                urls.thumbnail_url = screen.src.replace(/compo2\/\//g, "compo2/");
                urls.full_url = imgoc.substring(imgoc.lastIndexOf("http://"), imgoc.indexOf('")'));
            }
            return urls;
        })
            .filter(function (s) { return s.full_url.length > 0; }),
        links: linksArray.map(function (link) {
            return {
                label: link.textContent || "",
                url: link.getAttribute("href")
            };
        }),
        ratings: extractRatings(ratingTable),
        platforms: []
    };
    entry.platforms = arrayFromSet(detectPlatforms(entry));
    return entry;
}
var MAX_INFLIGHT = 10;
function extractEntryFromPage(state, link, thumb) {
    var uid = parseInt(link.substr(link.indexOf("uid=") + 4));
    return entryDoc(state.issue, uid)
        .then(function (doc) {
        return createEntry(link, state.issue, uid, thumb, doc);
    });
}
function completed(state) {
    if (state.completionPromise) {
        return state.completionPromise;
    }
    console.info("Extraction complete, writing " + state.entries.length + " entries to catalog file...");
    var catalog = {
        issue: state.issue,
        theme: IssueThemeNames[state.issue],
        stats: state.stats,
        entries: state.entries
    };
    var catalogJSON = JSON.stringify(catalog);
    state.completionPromise = new Promise(function (resolve, reject) {
        fs.writeFile(entriesCatalogPath(state.issue), catalogJSON, function (err) {
            if (err) {
                console.info("Could not write catalog file: ", err);
                reject(err);
            }
            else {
                console.info("Done");
                resolve();
            }
        });
    });
    return state.completionPromise;
}
function updateStats(stats, entry) {
    stats.entries += 1;
    if (entry.category === "compo") {
        stats.compoEntries += 1;
    }
    else {
        stats.jamEntries += 1;
    }
    for (var _i = 0, _a = entry.ratings; _i < _a.length; _i++) {
        var rating = _a[_i];
        if (rating.area in stats.ratingDistribution) {
            stats.ratingDistribution[rating.area] += 1;
        }
        else {
            stats.ratingDistribution[rating.area] = 1;
        }
    }
}
function tryNext(state) {
    var checkDone = function () {
        if (state.done) {
            return true;
        }
        state.done = (state.source.links.length === 0 && state.inFlight.length === 0);
        return state.done;
    };
    if (checkDone()) {
        return completed(state);
    }
    if (state.source.links.length > 0 && state.inFlight.length < MAX_INFLIGHT) {
        var link_1 = state.source.links.shift();
        var thumb = state.source.thumbs.shift();
        var unqueueSelf_1 = function (prom) {
            var promIx = state.inFlight.indexOf(prom);
            if (promIx < 0) {
                console.error("Can't find myself in the inFlight array!", state.inFlight, prom);
                return Promise.reject("internal inconsistency error");
            }
            state.inFlight.splice(promIx, 1);
            if (checkDone()) {
                return completed(state);
            }
            else {
                return Promise.resolve();
            }
        };
        var p_1 = extractEntryFromPage(state, link_1, thumb)
            .then(function (entry) {
            state.entries.push(entry);
            updateStats(state.stats, entry);
            var totalCount = state.source.links.length + state.entries.length;
            if (state.entries.length % 10 === 0) {
                console.info((100 * (state.entries.length / totalCount)).toFixed(1) + "%");
            }
            return unqueueSelf_1(p_1);
        })
            .catch(function (err) {
            console.info("ERROR for " + link_1 + ": ", err);
            return unqueueSelf_1(p_1);
        });
        state.inFlight.push(p_1);
    }
    return timeoutPromise(1).then(function () { return tryNext(state); });
}
function extractEntries(issue) {
    if (isNaN(issue) || issue < 15 || issue > 99) {
        return Promise.reject("issue must be (15 <= issue <= 99)");
    }
    console.info("Extracting entry records for issue " + issue);
    return loadCatalog(issue).then(function (catalogIndex) {
        return tryNext({
            issue: issue,
            done: false,
            inFlight: [],
            source: catalogIndex,
            stats: {
                entries: 0,
                compoEntries: 0,
                jamEntries: 0,
                ratingDistribution: {}
            },
            entries: []
        });
    });
}

var tasks = new Map();
function task(name, action) {
    tasks.set(name, action);
}
function runTask(name) {
    var task = tasks.get(name);
    if (!task) {
        console.info("unknown task: " + name);
        return;
    }
    return task.apply(global, process.argv.slice(3));
}
function finished() {
    console.info("All tasks done.");
}
function runt() {
    var command = process.argv[2];
    if (!command) {
        var allTasks_1 = [];
        tasks.forEach(function (_, name) { return allTasks_1.push(name); });
        console.info("no task specified, available: " + allTasks_1);
    }
    else {
        var result = runTask(command);
        if (result instanceof Promise) {
            result.then(finished);
        }
        else {
            finished();
        }
    }
}

var MIN_ISSUE = 15;
var MAX_ISSUE = 37;
function getIssueRange(issueSA, issueSB) {
    var issueFrom = issueSA === undefined ? 0 : parseInt(issueSA);
    var issueTo = issueSB === undefined ? issueFrom : parseInt(issueSB);
    if (isNaN(issueFrom) || issueFrom < MIN_ISSUE || issueFrom > MAX_ISSUE || issueTo < issueFrom || issueTo > MAX_ISSUE) {
        console.info("usage: " + process.argv[2] + " <issueFrom: " + MIN_ISSUE + ".." + MAX_ISSUE + "> [<issueTo: " + MIN_ISSUE + ".." + MAX_ISSUE + ">]");
        return undefined;
    }
    return {
        from: issueFrom,
        to: issueTo
    };
}
function rangedTaskPerIssue(f, t, sitFn) {
    var range = getIssueRange(f, t);
    if (range) {
        var issue_1 = range.from - 1;
        var next_1 = function () {
            issue_1 += 1;
            if (issue_1 <= range.to) {
                return sitFn(issue_1).then(next_1);
            }
            else {
                return Promise.resolve();
            }
        };
        return next_1();
    }
    else {
        return Promise.resolve();
    }
}
task("listing", function (f, t) {
    return rangedTaskPerIssue(f, t, fetchListing);
});
task("entries", function (f, t) {
    return rangedTaskPerIssue(f, t, fetchEntryPages);
});
task("thumbs", function (f, t) {
    return rangedTaskPerIssue(f, t, fetchThumbs);
});
task("extract", function (f, t) {
    return rangedTaskPerIssue(f, t, extractEntries);
});
runt();
