export function detectVulns(jsonResults: object | any[]): boolean {
  if (Array.isArray(jsonResults)) {
    return jsonResults.some((result) => !!result.uniqueCount);
  }

  if (jsonResults['uniqueCount'] && jsonResults['uniqueCount'] > 0) {
    return true;
  }

  return false;
}
