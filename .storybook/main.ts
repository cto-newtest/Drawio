import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "storybook-addon-designs",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, '../src'),
      '@entities': require('path').resolve(__dirname, '../src/entities'),
      '@features': require('path').resolve(__dirname, '../src/features'),
      '@widgets': require('path').resolve(__dirname, '../src/widgets'),
      '@pages': require('path').resolve(__dirname, '../src/pages'),
      '@shared': require('path').resolve(__dirname, '../src/shared'),
      '@processes': require('path').resolve(__dirname, '../src/processes'),
    };
    
    return config;
  },
};

export default config;