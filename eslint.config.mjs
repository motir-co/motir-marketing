import { defineConfig, globalIgnores } from 'eslint/config'
import astro from 'eslint-plugin-astro'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/*
 * THE RULES eslint-config-next APPLIED, WITHOUT NEXT (MOTIR-10643).
 *
 * The site was linted by `eslint-config-next/core-web-vitals` and
 * `eslint-config-next/typescript`, the two configs motir-core extends. The
 * site no longer builds with Next, so the package goes — but its rules were
 * never about Next except for the `@next/next` plugin's, which name
 * `next/link`, `next/image` and `next/script`. So this is those two configs
 * written out with their own plugins: React's recommended rules and the
 * hooks rules (the React Compiler's among them), the five `jsx-a11y` checks
 * and `alt-text`, the anonymous-default-export warning, and typescript-eslint's
 * recommended set with its two unused-code rules at `warn`. Every rule is set
 * as eslint-config-next 16 set it.
 *
 * `eslint-plugin-astro` lints the `.astro` pages and layouts.
 */
export default defineConfig([
  globalIgnores([
    'dist/**',
    '.astro/**',
    '.wrangler/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
  ]),
  {
    name: 'site/react',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'import/no-anonymous-default-export': 'warn',
      'react/no-unknown-property': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'react/jsx-no-target-blank': 'off',
    },
  },
  ...tseslint.configs.recommended,
  {
    name: 'site/typescript',
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  ...astro.configs.recommended,
])
