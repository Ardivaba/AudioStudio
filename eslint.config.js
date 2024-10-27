import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";
import {includeIgnoreFile} from "@eslint/compat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    includeIgnoreFile(gitignorePath),
    ...compat.extends("eslint:recommended", "plugin:vue/vue3-recommended", "prettier").map(config => ({
        ...config,
        files: ["**/*.js", "**/*.vue"],
    })),
    {
        files: ["**/*.js", "**/*.vue"],
        rules: {
            "vue/require-default-prop": "off",
            "vue/no-v-html": "off",
            "no-empty-pattern": "off",
        },
    },
];