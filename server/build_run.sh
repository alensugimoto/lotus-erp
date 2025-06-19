cd ../dev_client &&
  gleam run -m lustre/dev build &&
  cd ../client &&
  gleam run -m lustre/dev build &&
  cd ../server &&
  gleam run
