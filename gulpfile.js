// gulpfile.js - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

const gulp = require("gulp");
const rollup = require("rollup-stream");
const source = require("vinyl-source-stream");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const path = require("path");

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

// bundle main site code
gulp.task("app", function() {
	return rollup({
		entry: "site/build/app/app/app.js",
		format: "iife",
		moduleName: "dtbb",
	})
	.pipe(source("dtbb.js"))
	.pipe(gulp.dest("site"));
});

// bundle site worker
gulp.task("worker", function() {
	return rollup({
		entry: "site/build/workers/workers/task_indexer.js",
		format: "iife",
	})
	.pipe(source("task_indexer.js"))
	.pipe(gulp.dest("site"));
});

// site composite task
gulp.task("site", ["styles", "app", "worker"], () => {});


// ---- import

// bundle import node app
gulp.task("import", function() {
	return rollup({
		entry: "import/build/import/import.js",
		format: "cjs",
		external: ["fs", "mkdirp", "request", "jsdom", path.resolve("import/build/import/request"), path.resolve("import/build/import/mkdirp")]
	})
	.pipe(source("import.js"))
	.pipe(gulp.dest("import"));
});


// ---- global watch

// auto-roller
gulp.task("watch", function() {
	gulp.watch("src/**/*.scss", ["styles"]);
	gulp.watch("site/build/app/**/*.js", ["app"]);
	gulp.watch("site/build/workers/**/*.js", ["worker"]);
	gulp.watch("import/build/**/*.js", ["import"]);
});
