const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Dodaj obsługę .cjs
config.resolver.sourceExts.push('cjs');

// Ignoruj node_modules w axios
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
