create table customer_email_addresses (
  customer_id integer references customers on delete cascade not null,
  address_id integer references email_addresses on delete restrict not null,
  purpose_id smallint references message_purposes on delete restrict not null,
  recipient_type_id smallint references message_recipient_types on delete restrict not null
);
