module.exports = {
  root: true,
  extends: [require.resolve('@antrique/config/eslint/base.cjs')],
  env: { node: true, jest: true },
  parserOptions: {
    sourceType: 'module',
  },
};
