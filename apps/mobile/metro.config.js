const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedRoot = path.resolve(workspaceRoot, "packages/shared");

const config = getDefaultConfig(projectRoot);

const extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};
const mobileScheduler = path.resolve(projectRoot, "node_modules/scheduler");
if (fs.existsSync(mobileScheduler)) {
  extraNodeModules.scheduler = mobileScheduler;
}

config.watchFolders = [workspaceRoot, sharedRoot];
config.resolver.extraNodeModules = extraNodeModules;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

function pathPrefixRegex(absPath) {
  const escaped = absPath.replace(/[/\\]/g, "[/\\\\]");
  return new RegExp(`^${escaped}[/\\\\].*`);
}

const prevBlockList = config.resolver.blockList;
const extraBlockList = [
  pathPrefixRegex(path.resolve(workspaceRoot, "node_modules/react")),
  pathPrefixRegex(path.resolve(workspaceRoot, "node_modules/react-dom")),
];
config.resolver.blockList = [
  ...(Array.isArray(prevBlockList) ? prevBlockList : [prevBlockList]),
  ...extraBlockList,
].filter(Boolean);

module.exports = config;
