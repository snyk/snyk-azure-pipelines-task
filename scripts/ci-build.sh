# This script build the project
# $1 - env (default not prod)

env="test"
if [[ ! -z "$1" ]]; then
  env="$1"
fi
echo "env: ${env}"

echo "Bulding project..."
npm run build
if [[ $env == "prod" ]]; then
  echo "npm prune --production..."
  npm prune --production  # remove devDependencies from node-modules
fi
echo "Project built"
