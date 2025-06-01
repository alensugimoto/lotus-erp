set -e
dropdb "$PGDATABASE"
createdb "$PGDATABASE"
