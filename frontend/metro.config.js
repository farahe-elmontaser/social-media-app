const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Cette ligne est cruciale pour que les nouvelles routes (Stories, DMs) fonctionnent
config.transformer.unstable_allowRequireContext = true;

module.exports = config;