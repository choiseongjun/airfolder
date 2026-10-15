module.exports = ({ config }) => {
  const release = ['production', 'preview'].includes(process.env.EAS_BUILD_PROFILE);
  return {
    ...config,
    plugins: [
      ...(config.plugins || []).filter(plugin => !release || (Array.isArray(plugin) ? plugin[0] : plugin) !== 'expo-dev-client'),
      ...(release ? ['./plugins/with-release-permissions'] : []),
    ],
    android: {
      ...config.android,
      blockedPermissions: [...new Set([
        ...(config.android?.blockedPermissions || []),
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_MEDIA_LOCATION',
        ...(release ? ['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.WRITE_EXTERNAL_STORAGE'] : []),
      ])],
    },
    web: { ...config.web, bundler: 'metro', output: 'single' },
    experiments: { ...config.experiments, baseUrl: '/mobile-preview' },
  };
};
