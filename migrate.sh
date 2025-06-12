set -e
dropdb "$PGDATABASE"
createdb "$PGDATABASE"
psql -f ./db/migrations/0000*
# psql -f ./db/migrations/0001*
psql -f ./db/migrations/0002*
# psql -f ./db/migrations/0003*
# psql -f ./db/migrations/0004*
psql -f ./db/migrations/0005*
psql -f ./db/migrations/0006*
psql -f ./db/migrations/0007*
psql -f ./db/migrations/0008*
psql -f ./db/migrations/0009*
psql -f ./db/migrations/0010*
psql -f ./db/migrations/0011*
psql -f ./db/migrations/0012*
# psql -f ./db/migrations/0013*
psql -f ./db/migrations/0014*
psql -f ./db/migrations/0015*
psql -f ./db/migrations/0016*
psql -f ./db/migrations/0017*
psql -f ./db/migrations/0025*
