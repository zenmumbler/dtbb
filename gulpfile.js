// gulpfile.js - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

const gulp = require("gulp");
const rollup = require("rollup-stream");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const uglify = require("gulp-uglify");
const gzip = require("gulp-gzip");
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
		// .pipe(rename({suffix: ".min"}))
		// .pipe(cssnano())
		// .pipe(gulp.dest("dist/assets/css"));
});

// bundle main site code
gulp.task("app", function() {
	return rollup({
		entry: "site/build/app/app/app.js",
		format: "iife",
		moduleName: "dtbb",
	})
	.pipe(source("dtbb.js"))
	.pipe(buffer())
	// .pipe(uglify({
	// 	mangle: false,
	// 	compress: false
	// }))
	.pipe(gulp.dest("site"));
});

// bundle site worker
gulp.task("worker", function() {
	return rollup({
		entry: "site/build/workers/workers/task_indexer.js",
		format: "iife",
	})
	.pipe(source("task_indexer.js"))
	.pipe(buffer())
	// .pipe(uglify({
	// 	mangle: true,
	// 	compress: false
	// }))
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


// ---- data

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


// ---- global watch

// auto-roller
gulp.task("watch", function() {
	gulp.watch("src/**/*.scss", ["styles"]);
	gulp.watch("site/build/app/**/*.js", ["app"]);
	gulp.watch("site/build/workers/**/*.js", ["worker"]);
	gulp.watch("import/build/**/*.js", ["import"]);
});
