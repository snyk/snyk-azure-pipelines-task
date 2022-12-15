#
# Copyright 2022 Snyk Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# This script build the project
# $1 - env (default not prod)

env="test"
if [[ ! -z "$1" ]]; then
  env="$1"
fi
echo "env: ${env}"

# `npm run build` now being done in CI

if [[ $env == "prod" ]]; then
  echo "npm prune --production..."
  npm prune --production  # remove devDependencies from node-modules
fi
echo "Project built"
