create table message_purposes (
  id smallint primary key generated always as identity,
  code text unique not null
);
