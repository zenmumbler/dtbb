"use strict";
var fs = require("fs");
var request = require("request");
var mkdirp = require("mkdirp");
var LDIssue = 0;
if (process.argv.length === 3) {
    LDIssue = parseInt(process.argv[2]);
    if (isNaN(LDIssue) || LDIssue < 15 || LDIssue > 99) {
        LDIssue = 0;
    }
}
if (LDIssue === 0) {
    console.info("Expected LD issue counter as sole arg (15 < issue < 99)");
    process.exit(1);
}
var baseURL = "http://ludumdare.com/compo/ludum-dare-" + LDIssue + "/";
var entriesDir = "../spider_data/entry_pages/entries_" + LDIssue + "/";
var entriesPrefix = "entry_";
var entriesPostfix = ".html";
var delayBetweenRequests = 50;
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
function load(urlList, index) {
    if (index >= urlList.length) {
        console.info("Done");
        return;
    }
    var link = urlList[index];
    var uid = link.substr(link.indexOf("uid=") + 4);
    var filePath = entriesDir + entriesPrefix + uid + entriesPostfix;
    var next = function () {
        if (index % 10 === 0) {
            console.info((100 * (index / urlList.length)).toFixed(1) + "%");
        }
        setTimeout(function () { load(urlList, index + 1); }, delayBetweenRequests);
    };
    if (fs.existsSync(filePath)) {
        next();
    }
    else {
        request(link, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                fs.writeFile(filePath, body, function (err) {
                    if (err) {
                        console.log("Failed to write file for uid: " + uid, err);
                    }
                    next();
                });
            }
            else {
                console.log("Failed to load entry page for uid: " + uid, error, response.statusCode);
                next();
            }
        });
    }
}
fs.readFile("../spider_data/catalogs/catalog_" + LDIssue + ".json", "utf8", function (catalogErr, data) {
    if (catalogErr) {
        console.info("Could not load catalog for issue " + LDIssue + ": " + catalogErr);
    }
    else {
        ensureDirectory(entriesDir)
            .then(function () {
            var json = JSON.parse(data);
            var links = json.links.map(function (u) { return baseURL + u; });
            load(links, 0);
        })
            .catch(function (dirErr) {
            console.info("Could not create entries directory: " + dirErr);
        });
    }
});
