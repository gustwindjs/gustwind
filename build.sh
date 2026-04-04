#!/usr/bin/env bash
# Stop deploying on error
# https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#The-Set-Builtin
set -e

curl -fsSL https://deno.land/x/install/install.sh | sh -s v2.7.7
/opt/buildhome/.deno/bin/deno task build
