/*
 * Copyright 2022 Snyk Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
  settings: { cache: true },
  parser: '@typescript-eslint/parser',
  // Pending https://github.com/typescript-eslint/typescript-eslint/issues/389
  // parserOptions: {
  //   project: './tsconfig.json',
  // },
  env: {
    node: true,
    es2020: true,
    'jest/globals': true,
  },
  plugins: ['jest', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-explicit-any': 0,

    // non-null assertions compromise the type safety somewhat, but many
    // our types are still imprecisely defined and we don't use noImplicitAny
    // anyway, so for the time being assertions are allowed
    '@typescript-eslint/no-non-null-assertion': 1,
    '@typescript-eslint/ban-ts-ignore': 'off',

    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-inferrable-types': 'off',
    'no-prototype-builtins': 0,
    'require-atomic-updates': 0,
  },
};
