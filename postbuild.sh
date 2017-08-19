#! /bin/bash

chmod +x ./build/script/*
git_commit_id=$(git rev-parse HEAD)
git_commit_date=$(git show -s --format=%ci HEAD |tail |awk '{print $1}')
filename="$git_commit_date-$git_commit_id"
tar -zcvf ./scmp-z-api-$filename.tar.gz ./build

while [ "$1" != "" ]; do
    PARAM=`echo $1 | awk -F= '{print $1}'`
    VALUE=`echo $1 | awk -F= '{print $2}'`
    case $PARAM in
        --dir)
            releaseDir=$VALUE
            ;;
        *)
            echo "ERROR: unknown parameter \"$PARAM\""
            usage
            exit 1
            ;;
    esac
    shift
done
echo "move build file to $releaseDir"
mv ./scmp-z-api-$filename.tar.gz $releaseDir