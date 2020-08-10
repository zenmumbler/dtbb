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
];
