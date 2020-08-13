import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;
	
	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

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
			commonjs(),
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
			commonjs(),
		]
	},

	// svelte app
	{
		input: "src/svapp/main.ts",
		output: {
			sourcemap: true,
			format: "iife",
			name: "dtbb",
			file: "site/dtbb.js"
		},
		plugins: [
			svelte({
				// enable run-time checks when not in production
				dev: !production,
				// we"ll extract any component CSS out into
				// a separate file - better for performance
				css: css => {
					css.write("site/dtbb.css", false);
				},
				preprocess: sveltePreprocess(),
			}),
	
			// If you have external dependencies installed from
			// npm, you"ll most likely need these plugins. In
			// some cases you"ll need additional configuration -
			// consult the documentation for details:
			// https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve({
				browser: true,
				dedupe: ["svelte"]
			}),
			commonjs(),
			typescript({ sourceMap: !production, tsconfig: "src/svapp/tsconfig.json" }),
	
			// In dev mode, call `npm run start` once
			// the bundle has been generated
			!production && serve(),
	
			// Watch the `public` directory and refresh the
			// browser on changes when not in production
			!production && livereload("site"),
	
			// If we"re building for production (npm run build
			// instead of npm run dev), minify
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	}
];
