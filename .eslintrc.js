module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'import', 'deprecation'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:unicorn/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  root: true,
  env: {
    node: true,
  },
  ignorePatterns: ['.eslintrc.js', 'jest.config.ts', 'schema.eslintrc.js','prisma/**'],
  overrides: [
    {
      files: ['tests/**/*.ts'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended', 'plugin:jest/style'],
      rules: {
        'import/no-unused-modules': ['off'],
      },
      env: {
        node: true,
        jest: true,
      },
    },
    {
      files: ['src/**/*.tsx'],
      plugins: ['react', '@typescript-eslint/eslint-plugin', 'import', 'deprecation'],
      settings: {
        react: {
          pragma: 'React',
          version: 'detect',
        },
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
          },
          node: true,
        },
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:unicorn/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:prettier/recommended',
      ],
      rules: {
        'no-await-in-loop': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-expect-error': 'allow-with-description',
            'ts-ignore': true,
            'ts-nocheck': true,
            'ts-check': true,
            minimumDescriptionLength: 3,
          },
        ],
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-misused-promises': [
          'error',
          {
            checksVoidReturn: {
              attributes: false,
              arguments: false,
            },
          },
        ],
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/no-null': 'off',
        'unicorn/filename-case': 'off',
        'import/namespace': 'off',
        'import/newline-after-import': ['error', { count: 1 }],
        'import/no-unused-modules': ['off'],
        'import/order': [
          'error',
          {
            alphabetize: { order: 'asc' },
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            pathGroups: [{ pattern: '~/**', group: 'internal' }],
            'newlines-between': 'always',
          },
        ],
      },
      env: {
        browser: true,
        node: true,
      },
    },
  ],
  rules: {
    'no-console': ['off'], // TODO restore when ready
    'no-debugger': ['error'],
    'no-return-await': ['off'],
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': true,
        minimumDescriptionLength: 3,
      },
    ],
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/return-await': ['error', 'always'],
    'deprecation/deprecation': 'error',
    'import/namespace': 'off',
    'import/newline-after-import': ['error', { count: 1 }],
    'import/no-unused-modules': [
      'off',
      {
        unusedExports: true,
        missingExports: true,
        ignoreExports: ['./src/migrations/**/*.ts'],
      },
    ],
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc' },
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [{ pattern: '~/**', group: 'internal' }],
        'newlines-between': 'always',
      },
    ],
    'unicorn/no-null': 'off',
    'unicorn/no-abusive-eslint-disable': 'off',
    'unicorn/prefer-top-level-await': 'off',
  },
};
