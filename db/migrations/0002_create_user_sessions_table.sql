create table user_sessions (
    session_token text primary key,
    user_id smallint references users on delete cascade not null
);
