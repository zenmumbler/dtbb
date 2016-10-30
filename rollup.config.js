import uglify from "rollup-plugin-uglify";

export default {
	entry: "js/src/app.js",
	dest: "js/dtbb.js",
	format: "iife",
	moduleName: "dtbb",
	plugins: [
		// uglify()
	]
};
