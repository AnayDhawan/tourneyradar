import nextPlugin from 'eslint-config-next';

export default [
  {
    ignores: ['node_modules', '.next', 'dist', 'build'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...nextPlugin,
  },
];
