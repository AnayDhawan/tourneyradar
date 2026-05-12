import nextPlugin from 'eslint-config-next';

const config = [
  {
    ignores: ['node_modules', '.next', 'dist', 'build'],
  },
  ...nextPlugin,
];

export default config;
