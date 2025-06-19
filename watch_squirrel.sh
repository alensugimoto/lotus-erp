cd server &&
  watchexec \
    --wrap-process=session \
    --watch=src \
    --exts=sql \
    -- "$(<squirrel.sh)" &&
  cd ..
