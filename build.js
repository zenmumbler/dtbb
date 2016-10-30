var Builder = require('systemjs-builder');

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
