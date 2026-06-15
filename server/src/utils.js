export function getDeviceType(innerWidth) {
  if (innerWidth < 768) return 'mobile';
  if (innerWidth < 1024) return 'tablet';
  return 'desktop';
}

export function screenshotFilename(pagePath, deviceType) {
  const safe = pagePath.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'root';
  return `${safe}_${deviceType}.jpg`;
}
