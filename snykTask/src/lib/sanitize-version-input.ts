import * as semver from 'semver';

export function sanitizeVersionInput(versionString: string = ''): string {
  const version = versionString.toLowerCase().trim();
  const validDistributionChannels = ['stable', 'preview'];

  if (semver.valid(semver.clean(version))) {
    return `v${semver.clean(version)}`;
  }

  if (validDistributionChannels.includes(version)) {
    return version;
  }

  return 'stable';
}
