
-- Module 1: Foundation — multi-tenant scaffolding
create type public.app_role as enum ('owner','admin','manager','operator','finance');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Profiles: select own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Profiles: insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "Profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- Companies (tenants)
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

-- Memberships
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.app_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;

-- Security definer helpers to avoid recursion
create or replace function public.is_company_member(_user_id uuid, _company_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.memberships where user_id = _user_id and company_id = _company_id);
$$;

create or replace function public.has_company_role(_user_id uuid, _company_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = _user_id and company_id = _company_id and role = _role
  );
$$;

-- Companies policies
create policy "Companies: members can view" on public.companies
  for select to authenticated using (public.is_company_member(auth.uid(), id));
create policy "Companies: authenticated can create" on public.companies
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Companies: owner/admin can update" on public.companies
  for update to authenticated using (
    public.has_company_role(auth.uid(), id, 'owner') or public.has_company_role(auth.uid(), id, 'admin')
  );

-- Memberships policies
create policy "Memberships: see own" on public.memberships
  for select to authenticated using (user_id = auth.uid());
create policy "Memberships: see same company" on public.memberships
  for select to authenticated using (public.is_company_member(auth.uid(), company_id));
create policy "Memberships: owner/admin can insert" on public.memberships
  for insert to authenticated with check (
    user_id = auth.uid()
    or public.has_company_role(auth.uid(), company_id, 'owner')
    or public.has_company_role(auth.uid(), company_id, 'admin')
  );
create policy "Memberships: owner/admin can update" on public.memberships
  for update to authenticated using (
    public.has_company_role(auth.uid(), company_id, 'owner')
    or public.has_company_role(auth.uid(), company_id, 'admin')
  );
create policy "Memberships: owner/admin can delete" on public.memberships
  for delete to authenticated using (
    public.has_company_role(auth.uid(), company_id, 'owner')
    or public.has_company_role(auth.uid(), company_id, 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();
