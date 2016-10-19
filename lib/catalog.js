"use strict";
exports.PlatformList = (function () {
    var platforms = [];
    var platMask = 1;
    while (platMask <= 128) {
        platforms.push(platMask);
        platMask <<= 1;
    }
    return Object.freeze(platforms);
})();
