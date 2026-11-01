-- Sovereign Stay's initial relational schema and security foundation.
-- Public reads are limited to published listings and their public-safe data.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 120),
  avatar_path text,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique
    check (role_key in ('student', 'provider', 'admin')),
  display_name text not null unique,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.provider_businesses (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  legal_name text check (legal_name is null or char_length(legal_name) <= 200),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_business_memberships (
  id uuid primary key default gen_random_uuid(),
  provider_business_id uuid not null
    references public.provider_businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  membership_role text not null
    check (membership_role in ('owner', 'manager', 'editor')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_business_id, user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (char_length(btrim(label)) between 1 and 200),
  area text,
  city text not null,
  region text not null,
  country_code text not null default 'GH'
    check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 200),
  location_id uuid references public.locations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  provider_business_id uuid not null
    references public.provider_businesses (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  property_type text not null check (char_length(btrim(property_type)) between 1 and 80),
  description text not null default '',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'published', 'rejected', 'archived')),
  rejection_reason text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create table public.listing_institutions (
  listing_id uuid not null references public.listings (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (listing_id, institution_id)
);

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  type_key text not null unique,
  display_name text not null unique,
  default_occupancy integer check (default_occupancy is null or default_occupancy > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_rooms (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  room_type_id uuid not null references public.room_types (id) on delete restrict,
  label text,
  price_amount numeric(12, 2) not null check (price_amount >= 0),
  currency text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  pricing_period text not null
    check (pricing_period in ('night', 'month', 'semester', 'academic_year')),
  occupancy integer not null check (occupancy > 0),
  available_quantity integer check (available_quantity is null or available_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, listing_id)
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  facility_key text not null unique,
  display_name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_facilities (
  property_id uuid not null references public.properties (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (property_id, facility_id)
);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  storage_bucket text not null,
  storage_path text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  alt_text text,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'ready', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  listing_room_id uuid,
  status text not null default 'unknown'
    check (status in ('unknown', 'available', 'limited', 'unavailable')),
  available_quantity integer check (available_quantity is null or available_quantity >= 0),
  last_confirmed_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_room_id, listing_id)
    references public.listing_rooms (id, listing_id) on delete cascade
);

-- These append-only tables retain the reason and actor for privileged changes.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  actor_user_id uuid not null references public.profiles (id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  reason text,
  created_at timestamptz not null default now(),
  check (previous_status in ('draft', 'pending_approval', 'published', 'rejected', 'archived')),
  check (new_status in ('draft', 'pending_approval', 'published', 'rejected', 'archived'))
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  provider_business_id uuid references public.provider_businesses (id) on delete restrict,
  property_id uuid references public.properties (id) on delete restrict,
  actor_user_id uuid not null references public.profiles (id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  reason text,
  created_at timestamptz not null default now(),
  check ((provider_business_id is null) <> (property_id is null)),
  check (previous_status in ('unverified', 'pending', 'verified', 'rejected')),
  check (new_status in ('unverified', 'pending', 'verified', 'rejected'))
);

create index user_roles_role_id_idx on public.user_roles (role_id);
create index provider_memberships_user_business_idx
  on public.provider_business_memberships (user_id, provider_business_id);
create index institutions_location_id_idx on public.institutions (location_id);
create index properties_business_id_idx on public.properties (provider_business_id);
create index properties_location_id_idx on public.properties (location_id);
create index properties_search_idx on public.properties
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));
create index listings_property_id_idx on public.listings (property_id);
create index listings_public_order_idx
  on public.listings (published_at desc, id)
  where status = 'published';
create index listings_search_idx on public.listings
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));
create index listing_institutions_institution_id_idx
  on public.listing_institutions (institution_id, listing_id);
create index listing_rooms_search_idx
  on public.listing_rooms (room_type_id, price_amount, listing_id)
  where is_active;
create index listing_rooms_listing_idx
  on public.listing_rooms (listing_id, is_active, price_amount);
create index listing_rooms_price_idx
  on public.listing_rooms (price_amount, listing_id)
  where is_active;
create index property_facilities_facility_id_idx
  on public.property_facilities (facility_id, property_id);
create index listing_media_order_idx on public.listing_media (listing_id, sort_order);
create unique index listing_media_single_cover_idx
  on public.listing_media (listing_id)
  where is_cover;
create index availability_listing_idx on public.availability (listing_id);
create index availability_room_idx on public.availability (listing_room_id)
  where listing_room_id is not null;
create unique index availability_one_listing_record_idx
  on public.availability (listing_id)
  where listing_room_id is null;
create unique index availability_one_room_record_idx
  on public.availability (listing_room_id)
  where listing_room_id is not null;
create index moderation_actions_listing_created_idx
  on public.moderation_actions (listing_id, created_at desc);
create index verification_events_business_created_idx
  on public.verification_events (provider_business_id, created_at desc)
  where provider_business_id is not null;
create index verification_events_property_created_idx
  on public.verification_events (property_id, created_at desc)
  where property_id is not null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_role_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 120), '')
  )
  on conflict (id) do nothing;

  select role.id into v_student_role_id
  from public.roles as role
  where role.role_key = 'student';

  if v_student_role_id is null then
    raise exception 'The role catalogue must be seeded before user registration.';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (new.id, v_student_role_id)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

create trigger auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger provider_businesses_set_updated_at before update on public.provider_businesses
  for each row execute function public.set_updated_at();
create trigger provider_memberships_set_updated_at before update on public.provider_business_memberships
  for each row execute function public.set_updated_at();
create trigger locations_set_updated_at before update on public.locations
  for each row execute function public.set_updated_at();
create trigger institutions_set_updated_at before update on public.institutions
  for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger room_types_set_updated_at before update on public.room_types
  for each row execute function public.set_updated_at();
create trigger listing_rooms_set_updated_at before update on public.listing_rooms
  for each row execute function public.set_updated_at();
create trigger facilities_set_updated_at before update on public.facilities
  for each row execute function public.set_updated_at();
create trigger listing_media_set_updated_at before update on public.listing_media
  for each row execute function public.set_updated_at();
create trigger availability_set_updated_at before update on public.availability
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER helpers avoid recursive membership-table RLS checks.
-- A fixed empty search_path plus schema-qualified names prevents object shadowing.
create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.account_status = 'active'
  );
$$;

create function public.has_role(p_role_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.role_key = p_role_key
      and exists (
        select 1 from public.profiles as profile
        where profile.id = user_role.user_id and profile.account_status = 'active'
      )
  );
$$;

create function public.is_business_member(
  p_provider_business_id uuid,
  p_membership_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_business_memberships as membership
    where membership.provider_business_id = p_provider_business_id
      and membership.user_id = auth.uid()
      and exists (
        select 1 from public.profiles as profile
        where profile.id = membership.user_id and profile.account_status = 'active'
      )
      and (
        p_membership_roles is null
        or membership.membership_role = any (p_membership_roles)
      )
  );
$$;

create function public.is_property_public(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    where listing.property_id = p_property_id
      and listing.status = 'published'
  );
$$;

create function public.is_listing_public(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    where listing.id = p_listing_id
      and listing.status = 'published'
  );
$$;

create function public.is_property_business_member(
  p_property_id uuid,
  p_membership_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties as property
    join public.provider_business_memberships as membership
      on membership.provider_business_id = property.provider_business_id
    where property.id = p_property_id
      and membership.user_id = auth.uid()
      and exists (
        select 1 from public.profiles as profile
        where profile.id = membership.user_id and profile.account_status = 'active'
      )
      and (
        p_membership_roles is null
        or membership.membership_role = any (p_membership_roles)
      )
  );
$$;

create function public.is_listing_business_member(
  p_listing_id uuid,
  p_membership_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    join public.properties as property on property.id = listing.property_id
    join public.provider_business_memberships as membership
      on membership.provider_business_id = property.provider_business_id
    where listing.id = p_listing_id
      and membership.user_id = auth.uid()
      and exists (
        select 1 from public.profiles as profile
        where profile.id = membership.user_id and profile.account_status = 'active'
      )
      and (
        p_membership_roles is null
        or membership.membership_role = any (p_membership_roles)
      )
  );
$$;

create function public.create_provider_business(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_provider_role_id uuid;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'An active authenticated account is required.' using errcode = '42501';
  end if;

  if p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 160 then
    raise exception 'Business name must contain between 2 and 160 characters.'
      using errcode = '22023';
  end if;

  select role.id into v_provider_role_id
  from public.roles as role
  where role.role_key = 'provider';

  if v_provider_role_id is null then
    raise exception 'The role catalogue must be seeded before provider onboarding.';
  end if;

  insert into public.provider_businesses (display_name, created_by)
  values (btrim(p_display_name), v_user_id)
  returning id into v_business_id;

  insert into public.provider_business_memberships (
    provider_business_id, user_id, membership_role, created_by
  )
  values (v_business_id, v_user_id, 'owner', v_user_id);

  insert into public.user_roles (user_id, role_id, granted_by)
  values (v_user_id, v_provider_role_id, v_user_id)
  on conflict (user_id, role_id) do nothing;

  return v_business_id;
end;
$$;

create function public.invite_provider_business_member(
  p_provider_business_id uuid,
  p_user_id uuid,
  p_membership_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider_role_id uuid;
begin
  if auth.uid() is null
    or not public.is_active_user()
    or p_provider_business_id is null
    or p_user_id is null
    or p_membership_role is null
    or p_user_id = auth.uid()
    or p_membership_role not in ('manager', 'editor')
    or not exists (
      select 1
      from public.provider_business_memberships as membership
      where membership.provider_business_id = p_provider_business_id
        and membership.user_id = auth.uid()
        and membership.membership_role = 'owner'
    )
  then
    raise exception 'Only a business owner may add another manager or editor.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id and account_status = 'active'
  ) then
    raise exception 'The invited user profile does not exist or is not active.'
      using errcode = '22023';
  end if;

  select role.id into v_provider_role_id
  from public.roles as role
  where role.role_key = 'provider';

  if v_provider_role_id is null then
    raise exception 'The role catalogue must be seeded before provider onboarding.';
  end if;

  insert into public.provider_business_memberships as existing_membership (
    provider_business_id, user_id, membership_role, created_by
  )
  values (p_provider_business_id, p_user_id, p_membership_role, auth.uid())
  on conflict (provider_business_id, user_id)
  do update
  set membership_role = excluded.membership_role, updated_at = now()
  where existing_membership.membership_role <> 'owner';

  if not found then
    raise exception 'An owner membership cannot be changed through this function.'
      using errcode = '42501';
  end if;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (p_user_id, v_provider_role_id, auth.uid())
  on conflict (user_id, role_id) do nothing;
end;
$$;

create function public.submit_listing_for_review(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listings as listing
  set status = 'pending_approval', rejection_reason = null
  from public.properties as property
  where listing.id = p_listing_id
    and property.id = listing.property_id
    and listing.status in ('draft', 'rejected')
    and public.is_business_member(
      property.provider_business_id,
      array['owner', 'manager', 'editor']::text[]
    );

  if not found then
    raise exception 'Listing not found, not editable, or not managed by the caller.'
      using errcode = '42501';
  end if;
end;
$$;

create function public.archive_provider_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listings as listing
  set status = 'archived'
  from public.properties as property
  where listing.id = p_listing_id
    and property.id = listing.property_id
    and listing.status <> 'archived'
    and public.is_business_member(
      property.provider_business_id,
      array['owner', 'manager']::text[]
    );

  if not found then
    raise exception 'Listing not found or not archivable by the caller.'
      using errcode = '42501';
  end if;
end;
$$;

create function public.admin_review_listing(
  p_listing_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
  v_new_status text;
begin
  if not public.has_role('admin') then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('publish', 'reject') then
    raise exception 'Decision must be publish or reject.' using errcode = '22023';
  end if;

  v_new_status := case when p_decision = 'publish' then 'published' else 'rejected' end;

  select listing.status into v_previous_status
  from public.listings as listing
  where listing.id = p_listing_id and listing.status = 'pending_approval'
  for update;

  if not found then
    raise exception 'Only a pending listing can be reviewed.' using errcode = '22023';
  end if;

  update public.listings as listing
  set status = v_new_status,
      rejection_reason = case when v_new_status = 'rejected' then p_reason else null end,
      published_at = case when v_new_status = 'published' then now() else null end
  where listing.id = p_listing_id;

  insert into public.moderation_actions (
    listing_id, actor_user_id, previous_status, new_status, reason
  )
  values (p_listing_id, auth.uid(), v_previous_status, v_new_status, p_reason);
end;
$$;

create function public.admin_set_provider_verification(
  p_provider_business_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  if not public.has_role('admin') then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('unverified', 'pending', 'verified', 'rejected') then
    raise exception 'Unsupported provider verification status.' using errcode = '22023';
  end if;

  select business.verification_status into v_previous_status
  from public.provider_businesses as business
  where business.id = p_provider_business_id
  for update;
  if not found then
    raise exception 'Provider business not found.' using errcode = '22023';
  end if;

  update public.provider_businesses as business
  set verification_status = p_status
  where business.id = p_provider_business_id;

  insert into public.verification_events (
    provider_business_id, actor_user_id, previous_status, new_status, reason
  )
  values (
    p_provider_business_id, auth.uid(), v_previous_status, p_status, p_reason
  );
end;
$$;

create function public.admin_set_property_verification(
  p_property_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  if not public.has_role('admin') then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('unverified', 'pending', 'verified', 'rejected') then
    raise exception 'Unsupported property verification status.' using errcode = '22023';
  end if;

  select property.verification_status into v_previous_status
  from public.properties as property
  where property.id = p_property_id
  for update;
  if not found then
    raise exception 'Property not found.' using errcode = '22023';
  end if;

  update public.properties as property
  set verification_status = p_status
  where property.id = p_property_id;

  insert into public.verification_events (
    property_id, actor_user_id, previous_status, new_status, reason
  )
  values (p_property_id, auth.uid(), v_previous_status, p_status, p_reason);
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon, authenticated;
revoke all on function public.has_role(text) from public, anon, authenticated;
revoke all on function public.is_business_member(uuid, text[]) from public, anon, authenticated;
revoke all on function public.is_property_public(uuid) from public, anon, authenticated;
revoke all on function public.is_listing_public(uuid) from public, anon, authenticated;
revoke all on function public.is_property_business_member(uuid, text[]) from public, anon, authenticated;
revoke all on function public.is_listing_business_member(uuid, text[]) from public, anon, authenticated;
revoke all on function public.create_provider_business(text) from public, anon, authenticated;
revoke all on function public.invite_provider_business_member(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_listing_for_review(uuid) from public, anon, authenticated;
revoke all on function public.archive_provider_listing(uuid) from public, anon, authenticated;
revoke all on function public.admin_review_listing(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_provider_verification(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_property_verification(uuid, text, text) from public, anon, authenticated;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_business_member(uuid, text[]) to authenticated;
grant execute on function public.is_property_public(uuid) to anon, authenticated;
grant execute on function public.is_listing_public(uuid) to anon, authenticated;
grant execute on function public.is_property_business_member(uuid, text[]) to authenticated;
grant execute on function public.is_listing_business_member(uuid, text[]) to authenticated;
grant execute on function public.create_provider_business(text) to authenticated;
grant execute on function public.invite_provider_business_member(uuid, uuid, text) to authenticated;
grant execute on function public.submit_listing_for_review(uuid) to authenticated;
grant execute on function public.archive_provider_listing(uuid) to authenticated;
grant execute on function public.admin_review_listing(uuid, text, text) to authenticated;
grant execute on function public.admin_set_provider_verification(uuid, text, text) to authenticated;
grant execute on function public.admin_set_property_verification(uuid, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.provider_businesses enable row level security;
alter table public.provider_business_memberships enable row level security;
alter table public.locations enable row level security;
alter table public.institutions enable row level security;
alter table public.properties enable row level security;
alter table public.listings enable row level security;
alter table public.listing_institutions enable row level security;
alter table public.room_types enable row level security;
alter table public.listing_rooms enable row level security;
alter table public.facilities enable row level security;
alter table public.property_facilities enable row level security;
alter table public.listing_media enable row level security;
alter table public.availability enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.verification_events enable row level security;

revoke all on public.profiles, public.roles, public.user_roles,
  public.provider_businesses, public.provider_business_memberships,
  public.locations, public.institutions, public.properties, public.listings,
  public.listing_institutions, public.room_types, public.listing_rooms,
  public.facilities, public.property_facilities, public.listing_media,
  public.availability, public.moderation_actions, public.verification_events
  from anon, authenticated;

grant select on public.roles, public.locations, public.institutions,
  public.room_types, public.facilities to anon, authenticated;
grant select (
  id, location_id, name, property_type, description,
  verification_status, created_at, updated_at
) on public.properties to anon;
grant select (
  id, property_id, name, description, status, published_at, created_at, updated_at
) on public.listings to anon;
grant select (listing_id, institution_id, created_at)
  on public.listing_institutions to anon;
grant select (
  id, listing_id, room_type_id, label, price_amount, currency,
  pricing_period, occupancy, available_quantity, is_active, created_at, updated_at
) on public.listing_rooms to anon;
grant select (property_id, facility_id, created_at)
  on public.property_facilities to anon;
grant select (
  id, listing_id, kind, storage_bucket, storage_path, sort_order,
  is_cover, alt_text, processing_status, created_at, updated_at
) on public.listing_media to anon;
grant select (
  id, listing_id, listing_room_id, status, available_quantity,
  last_confirmed_at, created_at, updated_at
) on public.availability to anon;
grant select on public.profiles, public.user_roles,
  public.provider_businesses, public.provider_business_memberships,
  public.listing_institutions, public.listing_rooms, public.property_facilities,
  public.moderation_actions, public.verification_events
  to authenticated;
grant select (
  id, location_id, name, property_type, description,
  verification_status, created_at, updated_at
) on public.properties to authenticated;
grant select (
  id, property_id, name, description, status, published_at, created_at, updated_at
) on public.listings to authenticated;
grant select (
  id, listing_id, kind, storage_bucket, storage_path, sort_order,
  is_cover, alt_text, processing_status, created_at, updated_at
) on public.listing_media to authenticated;
grant select (
  id, listing_id, listing_room_id, status, available_quantity,
  last_confirmed_at, created_at, updated_at
) on public.availability to authenticated;

grant update (display_name, avatar_path) on public.profiles to authenticated;
grant insert (provider_business_id, location_id, name, property_type, description, created_by)
  on public.properties to authenticated;
grant update (location_id, name, property_type, description)
  on public.properties to authenticated;
grant insert (property_id, name, description, created_by)
  on public.listings to authenticated;
grant update (name, description) on public.listings to authenticated;
grant insert (listing_id, institution_id) on public.listing_institutions to authenticated;
grant delete on public.listing_institutions to authenticated;
grant insert (
  listing_id, room_type_id, label, price_amount, currency,
  pricing_period, occupancy, available_quantity, is_active
) on public.listing_rooms to authenticated;
grant update (
  room_type_id, label, price_amount, currency, pricing_period,
  occupancy, available_quantity, is_active
) on public.listing_rooms to authenticated;
grant delete on public.listing_rooms to authenticated;
grant insert (property_id, facility_id) on public.property_facilities to authenticated;
grant delete on public.property_facilities to authenticated;
grant insert (
  listing_id, listing_room_id, status, available_quantity, last_confirmed_at, updated_by
) on public.availability to authenticated;
grant update (status, available_quantity, last_confirmed_at, updated_by)
  on public.availability to authenticated;
grant delete on public.availability to authenticated;

create policy "Profiles are private to their user and administrators"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_role('admin')));
create policy "Users update only their editable profile fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and account_status = 'active')
  with check (id = (select auth.uid()) and account_status = 'active');

create policy "Roles are readable"
  on public.roles for select to anon, authenticated using (true);
create policy "Users read their role assignments"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));

create policy "Business members and administrators read business records"
  on public.provider_businesses for select to authenticated
  using (
    (select public.is_business_member(id, null))
    or (select public.has_role('admin'))
  );
create policy "Business members and administrators read memberships"
  on public.provider_business_memberships for select to authenticated
  using (
    (select public.is_business_member(provider_business_id, null))
    or (select public.has_role('admin'))
  );

create policy "Locations are public catalogue data"
  on public.locations for select to anon, authenticated using (true);
create policy "Institutions are public catalogue data"
  on public.institutions for select to anon, authenticated using (true);
create policy "Room types are public catalogue data"
  on public.room_types for select to anon, authenticated using (true);
create policy "Facilities are public catalogue data"
  on public.facilities for select to anon, authenticated using (true);

create policy "Anonymous users read properties with a published listing"
  on public.properties for select to anon
  using ((select public.is_property_public(id)));
create policy "Authenticated users read public or managed properties"
  on public.properties for select to authenticated
  using (
    (select public.is_property_public(id))
    or (select public.is_business_member(provider_business_id, null))
    or (select public.has_role('admin'))
  );
create policy "Members create properties for their business"
  on public.properties for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_business_member(
      provider_business_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Members edit properties without live listings"
  on public.properties for update to authenticated
  using (
    (select public.is_business_member(
      provider_business_id, array['owner', 'manager', 'editor']::text[]
    ))
    and not (select public.is_property_public(id))
  )
  with check (
    (select public.is_business_member(
      provider_business_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create policy "Anonymous users read published listings only"
  on public.listings for select to anon using (status = 'published');
create policy "Authenticated users read published or authorized listings"
  on public.listings for select to authenticated
  using (
    (select public.is_listing_public(id))
    or (select public.has_role('admin'))
    or (select public.is_listing_business_member(id, null))
  );
create policy "Business members create draft listings"
  on public.listings for insert to authenticated
  with check (
    status = 'draft'
    and created_by = (select auth.uid())
    and (select public.is_property_business_member(
      property_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Business members edit unsubmitted listings"
  on public.listings for update to authenticated
  using (
    status in ('draft', 'rejected')
    and (select public.is_listing_business_member(
      id, array['owner', 'manager', 'editor']::text[]
    ))
  )
  with check (
    status in ('draft', 'rejected')
    and (select public.is_listing_business_member(
      id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create policy "Anonymous users read institutions for published listings"
  on public.listing_institutions for select to anon
  using ((select public.is_listing_public(listing_id)));
create policy "Authenticated users read public or managed listing institutions"
  on public.listing_institutions for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.is_listing_public(listing_id))
    or (select public.is_listing_business_member(listing_id, null))
  );
create policy "Members add institutions to unsubmitted listings"
  on public.listing_institutions for insert to authenticated
  with check (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Members remove institutions from unsubmitted listings"
  on public.listing_institutions for delete to authenticated
  using (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create policy "Anonymous users read room offers for published listings"
  on public.listing_rooms for select to anon
  using ((select public.is_listing_public(listing_id)));
create policy "Authenticated users read public or managed room offers"
  on public.listing_rooms for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.is_listing_public(listing_id))
    or (select public.is_listing_business_member(listing_id, null))
  );
create policy "Members add room offers to unsubmitted listings"
  on public.listing_rooms for insert to authenticated
  with check (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Members edit room offers on unsubmitted listings"
  on public.listing_rooms for update to authenticated
  using (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  )
  with check (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Members delete room offers from unsubmitted listings"
  on public.listing_rooms for delete to authenticated
  using (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create policy "Anonymous users read facilities of public properties"
  on public.property_facilities for select to anon
  using ((select public.is_property_public(property_id)));
create policy "Authenticated users read public or managed property facilities"
  on public.property_facilities for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.is_property_public(property_id))
    or (select public.is_property_business_member(property_id, null))
  );
create policy "Members add facilities before a property is published"
  on public.property_facilities for insert to authenticated
  with check (
    not (select public.is_property_public(property_id))
    and (select public.is_property_business_member(
      property_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Members remove facilities before a property is published"
  on public.property_facilities for delete to authenticated
  using (
    not (select public.is_property_public(property_id))
    and (select public.is_property_business_member(
      property_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create policy "Anonymous users read ready media for published listings"
  on public.listing_media for select to anon
  using (
    processing_status = 'ready'
    and (select public.is_listing_public(listing_id))
  );
create policy "Authenticated users read public or managed listing media"
  on public.listing_media for select to authenticated
  using (
    (select public.has_role('admin'))
    or (
      processing_status = 'ready'
      and (select public.is_listing_public(listing_id))
    )
    or (select public.is_listing_business_member(listing_id, null))
  );

create policy "Anonymous users read availability for published listings"
  on public.availability for select to anon
  using ((select public.is_listing_public(listing_id)));
create policy "Authenticated users read public or managed availability"
  on public.availability for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.is_listing_public(listing_id))
    or (select public.is_listing_business_member(listing_id, null))
  );
create policy "Business managers update availability"
  on public.availability for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager']::text[]
    ))
  );
create policy "Business managers maintain availability"
  on public.availability for update to authenticated
  using ((select public.is_listing_business_member(
    listing_id, array['owner', 'manager']::text[]
  )))
  with check (
    updated_by = (select auth.uid())
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager']::text[]
    ))
  );
create policy "Business managers delete availability"
  on public.availability for delete to authenticated
  using ((select public.is_listing_business_member(
    listing_id, array['owner', 'manager']::text[]
  )));

create policy "Administrators read moderation history"
  on public.moderation_actions for select to authenticated
  using ((select public.has_role('admin')));
create policy "Administrators read verification history"
  on public.verification_events for select to authenticated
  using (
    (select public.has_role('admin'))
    or (
      provider_business_id is not null
      and (select public.is_business_member(provider_business_id, null))
    )
    or (
      property_id is not null
      and (select public.is_property_business_member(property_id, null))
    )
  );
