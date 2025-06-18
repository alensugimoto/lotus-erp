# app

[![Package Version](https://img.shields.io/hexpm/v/app)](https://hex.pm/packages/app)
[![Hex Docs](https://img.shields.io/badge/hex-docs-ffaff3)](https://hexdocs.pm/app/)

```sh
gleam add app@1
```

```gleam
import app

pub fn main() -> Nil {
  // TODO: An example of the project in use
}
```

Further documentation can be found at <https://hexdocs.pm/app>.

## Development

To run the project, run the following commands in separate terminal windows:

```sh
pg_ctl start
. sq.sh
. ws.sh
```

To run the tests, run the following command:

```sh
gleam test
```

To run the migrations, run the following command:

```sh
. migrate.sh
```
