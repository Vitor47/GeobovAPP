const path = require("path");
const webpack = require("@nativescript/webpack");
const { NormalModuleReplacementPlugin } = require("webpack");

module.exports = (env) => {
	webpack.init(env);

	const useProductionApi =
		env.production === true ||
		env.production === "true" ||
		env.release === true;

	webpack.chainWebpack((config) => {
		if (!useProductionApi) return;

		// Release and `--env.production` call https://54.94.137.227.
		// Matches the resolved file, not the extensionless import request.
		config.plugin("GeoBovEnvironment").use(NormalModuleReplacementPlugin, [
			/[\\/]environments[\\/]environment\.ts$/,
			path.resolve(__dirname, "src/environments/environment.prod.ts"),
		]);
	});

	return webpack.resolveConfig();
};
