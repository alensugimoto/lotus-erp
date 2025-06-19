# NOTE: lustre/dev needs to be run even on server-only changes
# because tailwind reads server source files.
# NOTE: change to server directory to ensure server env is set up before running the server.
cd server &&
  watchexec \
    --wrap-process=session \
    --watch=../client/src \
    --watch=src \
    --exts=gleam,mjs,erl \
    --restart \
    -- "$(<build_run.sh)" &&
  cd ..
