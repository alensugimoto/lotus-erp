# NOTE: lustre/dev needs to be run even on changes only on the server,
# because tailwind reads server source files.
cd server && watchexec --wrap-process=session --watch=../client/src --watch=src --exts=gleam,mjs,erl --restart -- "cd ../client && gleam run -m lustre/dev build && cd ../server && gleam run"
