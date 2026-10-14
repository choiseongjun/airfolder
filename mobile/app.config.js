module.exports = ({ config }) => ({ ...config, web: { ...config.web, bundler: 'metro', output: 'single' }, experiments: { ...config.experiments, baseUrl: '/mobile-preview' } });
