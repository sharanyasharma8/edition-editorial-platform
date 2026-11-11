import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";
const preview: Preview = { parameters: { layout: "padded", controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } }, a11y: { test: "error" } } };
export default preview;
