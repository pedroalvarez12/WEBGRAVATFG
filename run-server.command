#!/bin/bash
cd "$(dirname "$0")"
# Usando livereload para que se actualice automáticamente en el navegador
/Users/pedroalvarez/Library/Python/3.11/bin/livereload -p 5500 .
exec $SHELL