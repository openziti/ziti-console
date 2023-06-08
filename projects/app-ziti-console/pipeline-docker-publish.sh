#!/bin/bash
# expects the source branch as first parameter
echo "source branch: " $1
# 
if [ $1 != "master" ];
then 
    echo "Publishing branch $1"
    yarn run docker-branch:build
    yarn run docker-branch:publish
    exit 0
fi 
# 
echo "Publishing branch $1 (as latest)" 
yarn run docker:build
yarn run docker:publish
exit 0
