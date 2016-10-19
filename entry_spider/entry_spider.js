"use strict";
var fs = require("fs");
var request = require("request");
var spiderutil_1 = require("../lib/spiderutil");
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
var delayBetweenRequests = 50;
var entriesWritten = 0;
var failures = 0;
function load(urlList, index) {
    if (index >= urlList.length) {
        console.info("Done (wrote " + entriesWritten + " entries, " + failures + " failures)");
        process.exit(failures);
    }
    var link = urlList[index];
    var uid = parseInt(link.substr(link.indexOf("uid=") + 4));
    var filePath = spiderutil_1.entryPageFilePath(LDIssue, uid);
    var next = function (overrideDelay) {
        if (index % 10 === 0) {
            console.info((100 * (index / urlList.length)).toFixed(1) + "%");
        }
        setTimeout(function () { load(urlList, index + 1); }, overrideDelay || delayBetweenRequests);
    };
    if (fs.existsSync(filePath)) {
        next(1);
    }
    else {
        request({
            url: link,
            timeout: 3000
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                fs.writeFile(filePath, body, function (err) {
                    if (err) {
                        console.log("Failed to write file for uid: " + uid, err);
                        failures += 1;
                    }
                    else {
                        entriesWritten += 1;
                    }
                    next();
                });
            }
            else {
                console.log("Failed to load entry page for uid: " + uid, error, response ? response.statusCode : "-");
                failures += 1;
                next();
            }
        });
    }
}
fs.readFile(spiderutil_1.catalogIndexPath(LDIssue), "utf8", function (catalogErr, data) {
    if (catalogErr) {
        console.info("Could not load catalog for issue " + LDIssue + ": " + catalogErr);
    }
    else {
        spiderutil_1.ensureDirectory(spiderutil_1.entryPagesDirPath(LDIssue))
            .then(function () {
            var baseURL = spiderutil_1.issueBaseURL(LDIssue);
            var json = JSON.parse(data);
            var links = json.links.map(function (u) { return baseURL + u; });
            load(links, 0);
        })
            .catch(function (dirErr) {
            console.info("Could not create entries directory: " + dirErr);
        });
    }
});
