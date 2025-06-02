create table message_recipient_types (
  id smallint primary key generated always as identity,
  code text unique not null
);
