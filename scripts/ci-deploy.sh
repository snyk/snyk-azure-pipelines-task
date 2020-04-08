#!/bin/bash

# This script deploy the Snyk Azure Extension via CI tool when there is a merge
# to the master branch.
# The version is generated automatic via semversione tool and the master branch
# will be tag with the version.
# $1 - Extension version
# $2 (Optional) - Organization that will be shared the extension

set -e

echo "Deploying extension..."
# Handle arguments
pattern="[0-9]+\.[0-9]+\.[0-9]+"
AZ_EXT_NEW_VERSION="$1"
if [[ ! "${AZ_EXT_NEW_VERSION}" =~ $pattern ]]; then
  echo "Version is required."
  exit 1
fi
echo "Version: ${AZ_EXT_NEW_VERSION}"

if [[ ! -z "$2" ]]; then
  AZ_ORG="$2"
  echo "Org: ${AZ_ORG}"
fi
PWD=$(pwd)
echo "PWD: ${PWD}"

echo "Installing tfx-cli globally..."
npm install -g tfx-cli@0.7.11

echo "Bulding project..."
npm install
npm run build
npm prune --production  # remove devDependencies from node-modules
cd snykTask
npm install
cd ..
echo "Project built"

if [[ ! -z "${AZ_ORG}" ]]; then
  "${PWD}/scripts/share-dev.sh" ${AZ_EXT_NEW_VERSION} ${AZ_ORG}
else
  "${PWD}/scripts/ci-publish.sh" ${AZ_EXT_NEW_VERSION}
echo "placeholder for deployment"
fi
echo "Extesion deployed!"
