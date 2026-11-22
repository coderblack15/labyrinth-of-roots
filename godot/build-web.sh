#!/bin/sh
# Builds the browser version into godot/play/ (served by GitHub Pages at /godot/play/).
# Needs Godot 4.3 and its export templates (web_nothreads_release.zip) installed.
# Usage: GODOT=/path/to/Godot_v4.3-stable_linux.x86_64 ./build-web.sh
set -e
cd "$(dirname "$0")"
GODOT="${GODOT:-godot}"
rm -f play/index.* play/*.wasm play/*.pck play/*.js play/*.png
"$GODOT" --headless --path . --export-release "Web" play/index.html
touch play/.gdignore
ls -la play
