watchexec --restart --wrap-process=session --exts=gleam,toml --ignore=*/manifest.toml -- "cd client && gleam run -m lustre/dev build && cd ../server && gleam run"
