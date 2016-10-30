var Builder = require('systemjs-builder');

// optional constructor options
// sets the baseURL and loads the configuration file
const builder = new Builder();

builder.config({
	defaultJSExtensions: true
});

builder
	.buildStatic('js/src/app.js', 'js/dtbb.js')
	.then(function() {
		console.log('Build complete');
	})
	.catch(function(err) {
		console.log('Build error');
		console.log(err);
	});
