import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import todoTickets from 'eslint-plugin-todo-tickets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...todoTickets.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'todo-tickets/todo-tickets': [
        'error',
        {
          suggestPlaceholderWithTicket: '#00',
          ticketPatterns: ['#\\d+'],
        },
      ],
    },
  },
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
];
