import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import nextJs from 'eslint-plugin-nextjs';

const eslintConfig = [
  nextJs.configs['recommended'],
  eslintPluginPrettierRecommended,
];

export default eslintConfig;