import uglify from "rollup-plugin-uglify";

export default {
	entry: "js/app/app.js",
	dest: "js/dtbb.js",
	format: "iife",
	moduleName: "dtbb",
	plugins: [
		// uglify()
	]
};
