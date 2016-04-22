// dtbb main
// (c) 2016 by Arthur Langereis (@zenmumbler)

/// <reference path="../defs/require.d.ts" />
/// <reference path="../defs/es6-promise.d.ts" />
/// <reference path="../defs/es6-collections.d.ts" />

requirejs.config({
	baseUrl: 'js',
});

requirejs(["app"]);
