import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        files: ['**/*.{js,cjs}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: {
            globals: globals.node,
            sourceType: 'commonjs',
        },
        rules: {
            curly: ['error', 'all'],
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
]);
