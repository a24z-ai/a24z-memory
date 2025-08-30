/* eslint-env node */
/* global module */
// Mock for globby to avoid ESM issues in Jest
const fg = require('fast-glob');

module.exports = {
  globby: async (patterns, options) => {
    // Convert globby options to fast-glob options
    const fgOptions = {
      ...options,
      // fast-glob doesn't have gitignore option, it's handled differently
      ignore: options.ignore || [],
    };
    delete fgOptions.gitignore;
    
    return fg(patterns, fgOptions);
  },
  
  globbySync: (patterns, options) => {
    // Convert globby options to fast-glob options
    const fgOptions = {
      ...options,
      // fast-glob doesn't have gitignore option
      ignore: options.ignore || [],
    };
    delete fgOptions.gitignore;
    
    return fg.sync(patterns, fgOptions);
  },
};