import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
    },
  },
  // Engine boundaries: pure TypeScript planning logic
  // May import nothing except other engine files and its own types.
  // Must not import react, react-dom, three, the DOM, data/ JSON, or any app folder.
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'engine/ must not import react. Engine is pure TypeScript.' },
            { name: 'react-dom', message: 'engine/ must not import react-dom.' },
            { name: 'three', message: 'engine/ must not import three.' },
          ],
          patterns: [
            {
              group: [
                '@app',
                '@app/**',
                '@components',
                '@components/**',
                '@features',
                '@features/**',
                '@data',
                '@data/**',
                '@state',
                '@state/**',
                '@three',
                '@three/**',
                '@animations',
                '@animations/**',
                '@hooks',
                '@hooks/**',
                '@styles',
                '@styles/**',
                '@config',
                '@config/**',
                '@i18n',
                '@i18n/**',
                '@types',
                '@types/**',
                '@utils',
                '@utils/**',
                '../*',
                '**/data/**',
              ],
              message:
                'engine/ may only import other engine files and its own types. Data is passed in as arguments.',
            },
          ],
        },
      ],
    },
  },
  // Data boundaries: data/ may import engine types only
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@app',
                '@app/**',
                '@components',
                '@components/**',
                '@features',
                '@features/**',
                '@state',
                '@state/**',
                '@three',
                '@three/**',
                '@animations',
                '@animations/**',
                '@hooks',
                '@hooks/**',
                '@styles',
                '@styles/**',
                '@config',
                '@config/**',
                '@i18n',
                '@i18n/**',
                '@types',
                '@types/**',
                '@utils',
                '@utils/**',
                '../app/**',
                '../components/**',
                '../features/**',
                '../state/**',
                '../three/**',
                '../animations/**',
                '../hooks/**',
                '../styles/**',
                '../config/**',
                '../i18n/**',
                '../types/**',
                '../utils/**',
              ],
              message: 'data/ may import engine types only.',
            },
          ],
        },
      ],
    },
  },
  // Components boundaries: components/ must not import features/, state/, or three/scenes/
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features',
                '@features/**',
                '@state',
                '@state/**',
                '@three/scenes',
                '@three/scenes/**',
                '../features/**',
                '../../features/**',
                '../state/**',
                '../../state/**',
                '../three/scenes/**',
                '../../three/scenes/**',
              ],
              message: 'components/ must not import features/, state/, or three/scenes/.',
            },
          ],
        },
      ],
    },
  },
  // Features boundaries: features/ must not import other features.
  // Shared logic belongs in components/, hooks/, or utils/.
  {
    files: ['src/features/story/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features/planner',
                '@features/planner/**',
                '@features/simulator',
                '@features/simulator/**',
                '@features/household',
                '@features/household/**',
                '@features/voice',
                '@features/voice/**',
                '@features/sources',
                '@features/sources/**',
                '../planner/**',
                '../simulator/**',
                '../household/**',
                '../voice/**',
                '../sources/**',
              ],
              message:
                'features must not import other features. Move shared logic to components, hooks, or utils.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/planner/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features/story',
                '@features/story/**',
                '@features/simulator',
                '@features/simulator/**',
                '@features/household',
                '@features/household/**',
                '@features/voice',
                '@features/voice/**',
                '@features/sources',
                '@features/sources/**',
                '../story/**',
                '../simulator/**',
                '../household/**',
                '../voice/**',
                '../sources/**',
              ],
              message:
                'features must not import other features. Move shared logic to components, hooks, or utils.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/simulator/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features/story',
                '@features/story/**',
                '@features/planner',
                '@features/planner/**',
                '@features/household',
                '@features/household/**',
                '@features/voice',
                '@features/voice/**',
                '@features/sources',
                '@features/sources/**',
                '../story/**',
                '../planner/**',
                '../household/**',
                '../voice/**',
                '../sources/**',
              ],
              message:
                'features must not import other features. Move shared logic to components, hooks, or utils.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/household/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features/story',
                '@features/story/**',
                '@features/planner',
                '@features/planner/**',
                '@features/simulator',
                '@features/simulator/**',
                '@features/voice',
                '@features/voice/**',
                '@features/sources',
                '@features/sources/**',
                '../story/**',
                '../planner/**',
                '../simulator/**',
                '../voice/**',
                '../sources/**',
              ],
              message:
                'features must not import other features. Move shared logic to components, hooks, or utils.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/voice/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features/story',
                '@features/story/**',
                '@features/planner',
                '@features/planner/**',
                '@features/simulator',
                '@features/simulator/**',
                '@features/household',
                '@features/household/**',
                '@features/sources',
                '@features/sources/**',
                '../story/**',
                '../planner/**',
                '../simulator/**',
                '../household/**',
                '../sources/**',
              ],
              message:
                'features must not import other features. Move shared logic to components, hooks, or utils.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/sources/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features/story',
                '@features/story/**',
                '@features/planner',
                '@features/planner/**',
                '@features/simulator',
                '@features/simulator/**',
                '@features/household',
                '@features/household/**',
                '@features/voice',
                '@features/voice/**',
                '../story/**',
                '../planner/**',
                '../simulator/**',
                '../household/**',
                '../voice/**',
              ],
              message:
                'features must not import other features. Move shared logic to components, hooks, or utils.',
            },
          ],
        },
      ],
    },
  },
  // Three boundaries: three/ must not import features/ or state/. Receives data through props.
  {
    files: ['src/three/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@features',
                '@features/**',
                '@state',
                '@state/**',
                '../features/**',
                '../../features/**',
                '../state/**',
                '../../state/**',
              ],
              message:
                'three/ must not import features/ or state/. It receives data through props.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist', 'node_modules', '*.config.js', '*.config.ts'],
  }
);
