module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo wires up the Reanimated 4 / Worklets transform automatically
  // in SDK 57; listing the plugins manually here causes duplicate-plugin errors.
  return {
    presets: ['babel-preset-expo'],
  };
};
