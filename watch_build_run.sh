# NOTE: lustre/dev needs to be run even on server-only changes
# because tailwind reads server source files.
# NOTE: change to server directory to ensure server env is set up before running the server.
# TODO: when only dev_client changes,
# no need to run `lustre/dev build` on client.
# Same for other more minor cases.
# Wait for issue to resolve: https://github.com/watchexec/watchexec/issues/33.
cd server &&
  watchexec \
    --wrap-process=session \
    --watch=../dev_client/src \
    --watch=../client/src \
    --watch=src \
    --exts=gleam,mjs,erl \
    --restart \
    -- "$(<build_run.sh)" &&
  cd ..
