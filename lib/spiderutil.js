"use strict";
var mkdirp = require("mkdirp");
function catalogIndexPath(issue) {
    return "../spider_data/catalogs/catalog_" + issue + ".json";
}
exports.catalogIndexPath = catalogIndexPath;
function entryPagesDirPath(issue) {
    return "../spider_data/entry_pages/entries_" + issue + "/";
}
exports.entryPagesDirPath = entryPagesDirPath;
function entryPageFilePath(issue, uid) {
    return entryPagesDirPath(issue) + "entry_" + uid + ".html";
}
exports.entryPageFilePath = entryPageFilePath;
function entriesCatalogPath(issue) {
    return "../site/data/ld" + issue + "_entries.json";
}
exports.entriesCatalogPath = entriesCatalogPath;
function gzippedEntriesCatalogPath(issue) {
    return "../site/data/ld" + issue + "_entries.gzjson";
}
exports.gzippedEntriesCatalogPath = gzippedEntriesCatalogPath;
function issueBaseURL(issue) {
    return "http://ludumdare.com/compo/ludum-dare-" + issue + "/";
}
exports.issueBaseURL = issueBaseURL;
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
exports.ensureDirectory = ensureDirectory;
