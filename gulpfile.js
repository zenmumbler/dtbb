// gulpfile.js - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-7 by Arthur Langereis (@zenmumbler)
// @ts-check

const gulp = require("gulp");
const rollup = require("rollup-stream");
const source = require("vinyl-source-stream");
const sass = require("gulp-sass");
const tsc = require("gulp-typescript");
const path = require("path");
const nodeResolve = require("rollup-plugin-node-resolve");
const commonjs = require("rollup-plugin-commonjs");

/*
	TLDR:
	use `gulp site` to compile and bundle all site code
	use `gulp import` to compile and bundle the import script
	use `gulp watch` to set watches on all phases of site and import
*/


// ---- site

// compile styles
function styles() {
	return gulp.src("src/app/views/dtbb.scss")
		.pipe(sass({
			outputStyle: "expanded",
			indentType: "tab",
			indentWidth: 1
		}).on("error", sass.logError))
		.pipe(gulp.dest("site"));
}


const tscApp = tsc.createProject("src/app/tsconfig.json");
function compileApp() {
	const tsResult = tscApp.src().pipe(tscApp());
	return tsResult.js.pipe(gulp.dest("site/build/app"));
}

// bundle main site code
const rollApp = gulp.series(compileApp, function() {
	return rollup({
		input: "build/app/app.js",
		output: {
			format: "iife",
			name: "dtbb",
		},
		plugins: [
			nodeResolve({
				jsnext: true,
				main: true
			}),
			commonjs({
				// non-CommonJS modules will be ignored, but you can also
				// specifically include/exclude files
				include: 'node_modules/**',  // Default: undefined

				// if false then skip sourceMap generation for CommonJS modules
				sourceMap: false,  // Default: true
			})
		]
	})
	.pipe(source("dtbb.js"))
	.pipe(gulp.dest("site"));
});

exports.app = rollApp;

// compile worker script
const tscWorkers = tsc.createProject("src/workers/tsconfig.json");
function compileWorkers() {
	const tsResult = tscWorkers.src().pipe(tscWorkers());
	return tsResult.js.pipe(gulp.dest("site/build/workers"));
}

// bundle site worker
const rollWorkers = gulp.series(compileWorkers, function() {
	return rollup({
		input: "build/workers/task_indexer.js",
		output: {
			format: "iife",
		},
		plugins: [
			nodeResolve({
				jsnext: true,
				main: true
			}),
			commonjs({
				// non-CommonJS modules will be ignored, but you can also
				// specifically include/exclude files
				include: 'node_modules/**',  // Default: undefined

				// if false then skip sourceMap generation for CommonJS modules
				sourceMap: false,  // Default: true
			})
		]
	})
	.pipe(source("task_indexer.js"))
	.pipe(gulp.dest("site"));
});

exports.workers = rollWorkers;

// site composite task
exports.site = gulp.parallel(styles, rollApp, rollWorkers);


// ---- import

const tscImport = tsc.createProject("src/import/tsconfig.json");
function compileImport() {
	const tsResult = tscImport.src().pipe(tscImport());
	return tsResult.js.pipe(gulp.dest("import/build"));
}

// bundle import node app
const rollImport = gulp.series(compileImport, function() {
	return rollup({
		input: "build/import/import.js",
		output: {
			format: "cjs",
		},
		external: ["fs", "mkdirp", "request", "jsdom", path.resolve("import/build/import/request"), path.resolve("import/build/import/mkdirp")]
	})
	.pipe(source("import.js"))
	.pipe(gulp.dest("import"));
});

exports.import = rollImport;


// ---- global watches

function watch() {
	gulp.watch("src/**/*.scss", styles);
	gulp.watch("src/lib/**/*.ts", gulp.parallel(rollApp, rollWorkers, rollImport));
	gulp.watch("src/app/**/*.ts", rollApp);
	gulp.watch("src/workers/**/*.ts", rollWorkers);
	gulp.watch("src/import/**/*.ts", rollImport);
}

exports.watch = watch;
