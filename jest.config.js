/*
 * Crown Copyright 2026, National Crime Agency
 *
 * Jest configuration for the Annotator plugin.
 * Follows standard Kibana plugin testing patterns.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../..',
  roots: ['<rootDir>/plugins/annotator'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/plugins/annotator',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/plugins/annotator/{common,public,server}/**/*.{ts,tsx}',
    '!<rootDir>/plugins/annotator/**/*.test.{ts,tsx}',
    '!<rootDir>/plugins/annotator/**/index.{ts,tsx}',
  ],
};
