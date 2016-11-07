import uglify from "rollup-plugin-uglify";

export default {
	entry: "workers/workers/task_indexer.js",
	dest: "workers/task_indexer.js",
	format: "iife",
	plugins: [
		// uglify()
	]
};
