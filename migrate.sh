#!/bin/bash
set -e
dropdb "$PGDATABASE"
createdb "$PGDATABASE"
psql -v ON_ERROR_STOP=on -f ./db/migrations/0000*
# psql -f ./db/migrations/0001*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0002*
# psql -f ./db/migrations/0003*
# psql -f ./db/migrations/0004*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0005*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0006*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0007*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0008*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0009*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0010*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0011*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0012*
# psql -f ./db/migrations/0013*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0014*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0015*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0016*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0017*
psql -v ON_ERROR_STOP=on -f ./db/migrations/0025*
