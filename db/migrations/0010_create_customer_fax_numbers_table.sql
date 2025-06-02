create table customer_fax_numbers (
  customer_id integer references customers on delete cascade not null,
  number_id integer references fax_numbers on delete restrict not null,
  purpose_id smallint references message_purposes on delete restrict not null
);
