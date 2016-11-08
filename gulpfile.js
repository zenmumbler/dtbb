// gulpfile.js - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

const gulp = require("gulp");
const rollup = require("rollup-stream");
const source = require("vinyl-source-stream");
const uglify = require("gulp-uglify");
const gzip = require("gulp-gzip");
const rename = require("gulp-rename");

// bundle main site code
gulp.task("rollsite", function() {
	return rollup({
		entry: "site/build/app/app/app.js",
		format: "iife",
		moduleName: "dtbb"
	})
	.pipe(source("dtbb.js"))
	.pipe(uglify({
		mangle: false,
		compress: true
	}))
	.pipe(gulp.dest("site"));
});

// bundle site worker
gulp.task("rollworker", function() {
	return rollup({
		entry: "site/build/workers/workers/task_indexer.js",
		format: "iife",
	})
	.pipe(source("task_indexer.js"))
	.pipe(uglify({
		mangle: false,
		compress: true
	}))
	.pipe(gulp.dest("site"));
});

// bundle import node app
gulp.task("rollimport", function() {
	return rollup({
		entry: "import/build/import/import.js",
		format: "cjs",
	})
	.pipe(source("import.js"))
	.pipe(gulp.dest("import"));
});

// roll all 3 by default
gulp.task("default", ["rollsite", "rollworker", "rollimport"], () => {});

// auto-roller
gulp.task("watchroll", function() {
	gulp.watch("site/build/**/*.js", ["rollsite", "rollworker"]);
	gulp.watch("import/build/**/*.js", ["rollimport"]);
});

// catalog data compressor
gulp.task("compressdata", function() {
	return gulp.src("site/data/*.json")
	.pipe(gzip({
		append: false,
		extension: "gzjson",
		gzipOptions: { level: 9 }
	}))
	.pipe(rename(function (path) {
		path.basename = path.basename.replace(".json", "");
	}))
	.pipe(gulp.dest("site/data"));
});
