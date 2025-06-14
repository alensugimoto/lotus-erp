watchexec --restart --wrap-process=session --exts=gleam,toml,mjs --ignore=*/manifest.toml -- "cd client && gleam run -m lustre/dev build && cd ../server && gleam run"
