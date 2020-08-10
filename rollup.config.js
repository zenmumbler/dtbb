import resolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";

export default [
	// import
	{
		input: "build/import/import.js",
		output: [{
			file: "import/import.js",
			format: "cjs",
		}],
		plugins: [
			resolve(),
			common(),
		],
		external: ["fs", "mkdirp", "got", "jsdom"]
	},

	// background indexer worker
	{
		input: "build/workers/task_indexer.js",
		output: [{
			file: "site/task_indexer.js",
			format: "iife",
		}],
		plugins: [
			resolve(),
			common(),
		]
	},

	// main app
	{
		input: "build/app/app.js",
		output: [{
			file: "site/dtbb.js",
			format: "iife",
			name: "dtbb"
		}],
		plugins: [
			resolve(),
			common(),
		]
	}
];
