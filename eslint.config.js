const typescriptParser = require('@typescript-eslint/parser')
const typescriptPlugin = require('@typescript-eslint/eslint-plugin')
const headersPlugin = require('eslint-plugin-headers')
const prettierPlugin = require('eslint-plugin-prettier')
const prettierConfig = require('eslint-config-prettier')

const headerRule = {
  'headers/header-format': [
    'error',
    {
      source: 'string',
      style: 'jsdoc',
      content:
        'Copyright © 2025 Anonyome Labs, Inc. All rights reserved.\n\nSPDX-License-Identifier: Apache-2.0',
    },
  ],
}

module.exports = [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'lib/**',
      'document/**',
      'gen/**',
      'graphql/**',
      'cjs/**',
      'types/**',
      'docs/**',
      'build/**',
      'src/gen/**',
    ],
  },

  // JavaScript files configuration
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // eslint:recommended rules
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },

  // TypeScript source files configuration
  {
    files: ['src/**/*.ts'],
    ignores: ['test/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.test.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      headers: headersPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      ...prettierPlugin.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-parameter-properties': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      // Note: tree-shaking/no-side-effects-in-initialization rule removed - plugin incompatible with ESLint 9
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
        },
      ],
      ...headerRule,
    },
  },

  // Declaration files configuration
  {
    files: ['**/*.d.ts'],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Test files configuration
  {
    files: [
      '**/*.test.ts',
      '**/test/**/*.ts',
      'integration-tests/**/*.ts',
      'src/utils/testing/**/*.ts',
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.test.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      headers: headersPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      ...prettierPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      ...headerRule,
    },
  },
]
