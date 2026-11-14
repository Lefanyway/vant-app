-- The avatar a fan picks in the app (an agent, a famous player or a fan badge), saved by its short id.
alter table public.profiles add column if not exists avatar text check (avatar is null or char_length(avatar) <= 40);
