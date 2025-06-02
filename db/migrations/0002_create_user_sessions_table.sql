create table user_sessions (
    session_token text primary key,
    username text references users on delete cascade not null
);
