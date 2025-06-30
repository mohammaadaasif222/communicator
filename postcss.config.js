// postcss.config.js
function getOptionalPlugin(name) {
  try {
    return require(name);
  } catch (error) {
    console.warn(`PostCSS plugin '${name}' not available, skipping...`);
    return null;
  }
}

const plugins = {};

// Add TailwindCSS if available
const tailwindcss = getOptionalPlugin('tailwindcss');
if (tailwindcss) {
  plugins.tailwindcss = {};
}

// Add Autoprefixer if available
const autoprefixer = getOptionalPlugin('autoprefixer');
if (autoprefixer) {
  plugins.autoprefixer = {};
}

export default {
  plugins
};