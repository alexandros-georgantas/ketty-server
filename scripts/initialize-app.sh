#!/bin/bash
set -x

yarn migrate && node ./scripts/seedsRunner.js && node app.js

