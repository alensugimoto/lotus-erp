select
    id,
    code,
    name
from
    customers
where
    $1 = '' or
    code ilike '%' || $1 || '%' or
    name ilike '%' || $1 || '%'
limit
    10;
