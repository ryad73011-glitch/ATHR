import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  {
    ignores: ['dist/*', 'web-build/*', 'node_modules/*', 'android/*', 'ios/*', '.expo/*'],
  },
];
