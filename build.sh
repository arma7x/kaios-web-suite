#!/bin/sh

REV=$(($(date +%s%N)/1000000))
CHROME_BUILD="chrome-build"
KAIOS_BUILD="kaios-build"
ZIP_BUILD="build"

rm ./*.zip
rm -R "./$CHROME_BUILD" || rm -R "./$KAIOS_BUILD"

cd chrome-extension && npm run build && cp -R ./dist "../$CHROME_BUILD"
cd ../ && rm "./$CHROME_BUILD"/assets/*.map

cd kaios-app && npm run build && cp -R ./public "../$KAIOS_BUILD"
cd ../ && rm "./$KAIOS_BUILD"/build/*.map

zip -r "./${ZIP_BUILD}_${REV}.zip" "./$CHROME_BUILD" "./$KAIOS_BUILD"
rm -R "./$CHROME_BUILD" && rm -R "./$KAIOS_BUILD"
