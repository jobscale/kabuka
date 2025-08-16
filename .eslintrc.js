module.exports = {
  extends: 'airbnb-base',
  globals: {},
  rules: {
    indent: ['error', 2, { MemberExpression: 0 }],
    'no-trailing-spaces': 'error',
    'arrow-parens': 'off',
    'class-methods-use-this': 'off',
    'no-await-in-loop': 'off',
    'object-curly-newline': ['error', {
      ObjectExpression: { minProperties: 6, multiline: true, consistent: true },
      ObjectPattern: { minProperties: 6, multiline: true, consistent: true },
      ImportDeclaration: { minProperties: 6, multiline: true, consistent: true },
      ExportDeclaration: { minProperties: 6, multiline: true, consistent: true },
    }],
    'no-restricted-syntax': 'off',
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
    'import/extensions': 'off',
  },
  env: {
    node: true,
    'jest/globals': true,
  },
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  plugins: [
    'jest',
  ],
};
