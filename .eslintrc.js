module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.js'],
      extends: 'eslint:recommended',
      parserOptions: { ecmaVersion: 2018 },
      env: { node: true },
    },
    {
      parser: '@typescript-eslint/parser',
      files: ['src/**/*.ts'],
      parserOptions: {
        project: './tsconfig.test.json',
      },
      excludedFiles: ['test/**/*.ts'],
      plugins: ['@typescript-eslint', 'tree-shaking', 'headers'],
      extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/array-type': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-floating-promises': 'error',
        'tree-shaking/no-side-effects-in-initialization': [
          2,
          {
            noSideEffectsWhenCalled: [
              {
                module: 'io-ts',
                functions: [
                    'type',
                    'intersection',
                    'array',
                    'partial'
                  // list of io-ts functions to exempt
                ]
              },
            ]
          }
        ],
        quotes: [
          'error',
          'single',
          {
            avoidEscape: true,
          },
        ],
        'headers/header-format': [
          'error',
          {
            source: 'string',
            style: 'jsdoc',
            content: 'Copyright © 2025 Anonyome Labs, Inc. All rights reserved.\n\nSPDX-License-Identifier: Apache-2.0'
          },
        ],
      },
    },
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: [
        '**/*.test.ts',
        '**/test/**/*.ts',
        'integration-tests/**/*.ts',
        'src/utils/testing/**/*.ts',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.test.json',
      },
      plugins: ['headers'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-floating-promises': 'error',
        '@tree-shaking/no-side-effects-in-initialization': 'off',
        'headers/header-format': [
          'error',
          {
            source: 'string',
            style: 'jsdoc',
            content: 'Copyright © 2025 Anonyome Labs, Inc. All rights reserved.\n\nSPDX-License-Identifier: Apache-2.0'
          },
        ],
      },
    }
  ]
}
