import buble from "rollup-plugin-buble";
import uglify from "rollup-plugin-uglify";

// buble currently has a bug with for of loops
function fixBuble (options) {
	return {
		name: 'fixBuble',
		transform: function (code, id) {
			return code.replace(/= void 0 (of|in)/g, (_, ofIn) => ofIn);
		}
	};
}

export default {
	entry: "js/src/app.js",
	dest: "js/dtbb.js",
	format: "iife",
	moduleName: "dtbb",
	plugins: [
		buble({
			transforms: {
				forOf: false
			}
		}),
		fixBuble(),
		// uglify()
	]
};
