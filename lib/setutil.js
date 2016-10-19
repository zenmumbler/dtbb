"use strict";
function intersectSet(dest, other) {
    var union = new Set();
    dest.forEach(function (index) {
        if (other.has(index)) {
            union.add(index);
        }
    });
    return union;
}
exports.intersectSet = intersectSet;
function newSetFromArray(source) {
    var set = new Set();
    var len = source.length;
    for (var vi = 0; vi < len; ++vi) {
        set.add(source[vi]);
    }
    return set;
}
exports.newSetFromArray = newSetFromArray;
