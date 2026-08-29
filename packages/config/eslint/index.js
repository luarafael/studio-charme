import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export const ignores = {
  ignores: [
    'dist/**',
    'build/**',
    'coverage/**',
    'legacy/**',
    'node_modules/**',
    '**/*.d.ts',
    'playwright-report/**',
    'test-results/**',
  ],
};

/** Regras compartilhadas por todos os pacotes do monorepo. */
export const sharedRules = {
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'prefer-const': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  },
};

/** Configuração base para pacotes TypeScript executados no Node. */
export const nodeConfig = tseslint.config(
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    ...sharedRules,
  },
  prettier,
);

/** Configuração base para pacotes isomórficos (schemas compartilhados). */
export const libraryConfig = tseslint.config(
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    ...sharedRules,
  },
  prettier,
);

export default nodeConfig;
