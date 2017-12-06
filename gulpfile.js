// gulpfile.js - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-7 by Arthur Langereis (@zenmumbler)
/* tslint:disable */

const gulp = require("gulp");
const rollup = require("rollup-stream");
const source = require("vinyl-source-stream");
const rename = require("gulp-rename");
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
gulp.task("styles", function() {
	return gulp.src("src/app/views/dtbb.scss")
		.pipe(sass({
			outputStyle: "expanded",
			indentType: "tab",
			indentWidth: 1
		}).on("error", sass.logError))
		.pipe(gulp.dest("site"));
});


const tscApp = tsc.createProject("src/app/tsconfig.json");
gulp.task("compile-app", function() {
	const tsResult = tscApp.src().pipe(tscApp());
	return tsResult.js.pipe(gulp.dest("site/build/app"));
});

// bundle main site code
gulp.task("app", ["compile-app"], function() {
	return rollup({
		input: "site/build/app/app/app.js",
		format: "iife",
		name: "dtbb",
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


// compile worker script
const tscWorkers = tsc.createProject("src/workers/tsconfig.json");
gulp.task("compile-workers", function() {
	const tsResult = tscWorkers.src().pipe(tscWorkers());
	return tsResult.js.pipe(gulp.dest("site/build/workers"));
});

// bundle site worker
gulp.task("workers", ["compile-workers"], function() {
	return rollup({
		input: "site/build/workers/workers/task_indexer.js",
		format: "iife",
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

// site composite task
gulp.task("site", ["styles", "app", "workers"], () => {});


// ---- import

const tscImport = tsc.createProject("src/import/tsconfig.json");
gulp.task("compile-import", function() {
	const tsResult = tscImport.src().pipe(tscImport());
	return tsResult.js.pipe(gulp.dest("import/build"));
});

// bundle import node app
gulp.task("import", ["compile-import"], function() {
	return rollup({
		input: "import/build/import/import.js",
		format: "cjs",
		external: ["fs", "mkdirp", "request", "jsdom", path.resolve("import/build/import/request"), path.resolve("import/build/import/mkdirp")]
	})
	.pipe(source("import.js"))
	.pipe(gulp.dest("import"));
});



// ---- global watches

gulp.task("watch", function() {
	gulp.watch("src/**/*.scss", ["styles"]);
	gulp.watch("src/lib/**/*.ts", ["app", "workers", "import"]);
	gulp.watch("src/app/**/*.ts", ["app"]);
	gulp.watch("src/workers/**/*.ts", ["workers"]);
	gulp.watch("src/import/**/*.ts", ["import"]);
});
