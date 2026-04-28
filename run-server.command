#!/bin/bash
cd "$(dirname "$0")"
python3 -m http.server 5500
exec $SHELL