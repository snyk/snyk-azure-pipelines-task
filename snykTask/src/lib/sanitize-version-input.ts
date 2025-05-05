import * as semver from 'semver';

export function sanitizeVersionInput(versionString: string = ''): string {
  const version = versionString.toLowerCase().trim();
  const validDistributionChannels = ['stable', 'preview'];

  if (validDistributionChannels.includes(version)) {
    return version;
  }

  const cleanedVersion = semver.clean(version);
  if (cleanedVersion && semver.valid(cleanedVersion)) {
    return `v${cleanedVersion}`;
  }

  console.log('Invalid version format. Defaulting to "stable".');
  return 'stable';
}
