const ROLLUP_VERSION = "^0.67.4";

function readPackage(pkg, context) {
	// Override the manifest of foo@1 after downloading it from the registry
	// Replace all dependencies with bar@2
	if (pkg.name === "rollup-stream") {
		pkg.dependencies.rollup = ROLLUP_VERSION;
		context.log(`Forced rollup of rollup-stream to be ${ROLLUP_VERSION}`);
	}
	
	return pkg;
}

module.exports = {
	hooks: {
		readPackage
	}
};
