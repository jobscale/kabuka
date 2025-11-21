import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';

export default [
  {
    name: 'standard base rule',
    ignores: ['**/coverage/**', '**/assets/**', '**/*.min.js'],
    plugins: {
      import: importPlugin,
    },
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    rules: {
      indent: ['error', 2, { MemberExpression: 0 }],
      quotes: ['error', 'single', { avoidEscape: true }],
      camelcase: ['error', { properties: 'never' }],
      semi: ['error', 'always'],
      eqeqeq: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'quote-props': ['error', 'as-needed'],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'padded-blocks': ['error', 'never'],
      'linebreak-style': ['error', 'unix'],
      'no-trailing-spaces': ['error'],
      // --- JavaScript coding style rule ---
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': ['error', 'always'],
      'comma-spacing': ['error', { before: false, after: true }],
      'func-call-spacing': ['error', 'never'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'lines-between-class-members': ['error', 'always'],
      'no-debugger': ['error'],
      'no-multi-spaces': ['error'],
      'object-curly-spacing': ['error', 'always'],
      'space-before-blocks': ['error', 'always'],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': ['error'],
      'spaced-comment': ['error', 'always'],
      'no-shadow': 'error',
      'no-console': ['warn'],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.name='Number']",
        message: 'using to Number.parseInt, Number.parseFloat',
      }],

      // --- import rule ---
      'import/named': ['error'],
      'import/default': ['error'],
      'import/no-duplicates': ['error'],
      'import/newline-after-import': ['error'],
      'import/no-mutable-exports': ['error'],

      'object-curly-newline': ['error', {
        ObjectExpression: { minProperties: 6, multiline: true, consistent: true },
        ObjectPattern: { minProperties: 6, multiline: true, consistent: true },
        ImportDeclaration: { minProperties: 6, multiline: true, consistent: true },
        ExportDeclaration: { minProperties: 6, multiline: true, consistent: true },
      }],
    },
  }, {
    name: 'jest rule',
    files: ['**/*.test.js', '**/__tests__/**/*.js'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
];
