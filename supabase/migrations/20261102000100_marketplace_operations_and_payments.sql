-- Add private student operations and provider transactions without rewriting
-- the already-versioned marketplace foundation.

alter table public.properties
  add constraint properties_id_business_unique unique (id, provider_business_id);
alter table public.listings
  add constraint listings_id_property_unique unique (id, property_id);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  property_id uuid not null,
  provider_business_id uuid not null,
  student_user_id uuid not null references public.profiles (id) on delete restrict,
  student_name text not null check (char_length(btrim(student_name)) between 1 and 120),
  student_email text not null check (char_length(student_email) <= 320),
  student_phone text not null check (char_length(btrim(student_phone)) between 7 and 40),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  viewing_date date,
  idempotency_key uuid not null,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, property_id)
    references public.listings (id, property_id) on delete restrict,
  foreign key (property_id, provider_business_id)
    references public.properties (id, provider_business_id) on delete restrict,
  unique (student_user_id, listing_id, idempotency_key)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  property_id uuid not null,
  provider_business_id uuid not null,
  listing_room_id uuid not null,
  student_user_id uuid not null references public.profiles (id) on delete restrict,
  move_in_date date not null,
  price_amount numeric(12, 2) not null check (price_amount > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  pricing_period text not null
    check (pricing_period in ('night', 'month', 'semester', 'academic_year')),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'rejected', 'cancelled', 'paid', 'completed')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, property_id)
    references public.listings (id, property_id) on delete restrict,
  foreign key (property_id, provider_business_id)
    references public.properties (id, provider_business_id) on delete restrict,
  foreign key (listing_room_id, listing_id)
    references public.listing_rooms (id, listing_id) on delete restrict,
  unique (id, listing_id, student_user_id),
  unique (student_user_id, idempotency_key)
);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  actor_user_id uuid references public.profiles (id) on delete set null,
  previous_status text,
  new_status text not null
    check (new_status in ('requested', 'accepted', 'rejected', 'cancelled', 'paid', 'completed')),
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  student_user_id uuid not null references public.profiles (id) on delete restrict,
  provider_reference text not null unique,
  idempotency_key uuid not null,
  amount_pesewas bigint not null check (amount_pesewas > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'initializing'
    check (status in ('initializing', 'pending', 'succeeded', 'failed')),
  gateway_transaction_id text,
  authorization_url text,
  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_user_id, idempotency_key)
);

create unique index payments_one_open_attempt_per_booking_idx
  on public.payments (booking_id)
  where status in ('initializing', 'pending', 'succeeded');
create index enquiries_provider_inbox_idx
  on public.enquiries (provider_business_id, status, created_at desc);
create index bookings_student_history_idx
  on public.bookings (student_user_id, created_at desc);
create index bookings_provider_queue_idx
  on public.bookings (provider_business_id, status, created_at desc);
create index payments_student_history_idx
  on public.payments (student_user_id, created_at desc);
create index booking_events_booking_created_idx
  on public.booking_events (booking_id, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique,
  listing_id uuid not null,
  student_user_id uuid not null references public.profiles (id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  moderation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (booking_id, listing_id, student_user_id)
    references public.bookings (id, listing_id, student_user_id) on delete restrict
);
create index reviews_public_listing_idx
  on public.reviews (listing_id, created_at desc)
  where status = 'published';

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  reporter_user_id uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (reason in ('inaccurate', 'unavailable', 'fraud', 'unsafe', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 3000),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listing_reports_admin_queue_idx
  on public.listing_reports (status, created_at desc);
create unique index listing_reports_one_open_reason_idx
  on public.listing_reports (listing_id, reporter_user_id, reason)
  where status in ('open', 'reviewing');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(btrim(kind)) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

create table public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 120),
  resource_type text not null check (char_length(btrim(resource_type)) between 1 and 80),
  resource_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index platform_audit_events_created_idx
  on public.platform_audit_events (created_at desc);

-- Email verification is enforced in addition to the Supabase Auth project
-- setting. This helper is reused by every authorization policy.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    join auth.users as auth_user on auth_user.id = profile.id
    where profile.id = auth.uid()
      and profile.account_status = 'active'
      and auth_user.confirmed_at is not null
      and (auth_user.banned_until is null or auth_user.banned_until <= now())
  );
$$;

create or replace function public.has_role(p_role_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.user_roles as user_role
    join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.role_key = p_role_key
  );
$$;

create or replace function public.is_business_member(
  p_provider_business_id uuid,
  p_membership_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.provider_business_memberships as membership
    where membership.provider_business_id = p_provider_business_id
      and membership.user_id = auth.uid()
      and (
        p_membership_roles is null
        or membership.membership_role = any (p_membership_roles)
      )
  );
$$;

create or replace function public.is_property_business_member(
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
    where property.id = p_property_id
      and public.is_business_member(property.provider_business_id, p_membership_roles)
  );
$$;

create or replace function public.is_listing_business_member(
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
    where listing.id = p_listing_id
      and public.is_business_member(property.provider_business_id, p_membership_roles)
  );
$$;

create trigger enquiries_set_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger listing_reports_set_updated_at before update on public.listing_reports
  for each row execute function public.set_updated_at();

create function public.record_platform_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_role('admin') then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;
  insert into public.platform_audit_events (
    actor_user_id, action, resource_type, resource_id, details
  ) values (auth.uid(), p_action, p_resource_type, p_resource_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

create function public.provider_update_booking_status(p_booking_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_next_status text;
  v_room_quantity integer;
  v_reserved_count bigint;
begin
  if not public.is_active_user() then
    raise exception 'An active verified account is required.' using errcode = '42501';
  end if;
  if p_status not in ('accepted', 'rejected', 'completed') then
    raise exception 'Unsupported provider booking decision.' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;
  if not found or not public.is_business_member(
    v_booking.provider_business_id, array['owner', 'manager']::text[]
  ) then
    raise exception 'Booking not found or not manageable by this provider.' using errcode = '42501';
  end if;

  if (v_booking.status = 'requested' and p_status in ('accepted', 'rejected'))
    or (v_booking.status = 'paid' and p_status = 'completed') then
    v_next_status := p_status;
  else
    raise exception 'This booking status transition is not allowed.' using errcode = '22023';
  end if;

  if v_next_status = 'accepted' then
    select available_quantity into v_room_quantity
    from public.listing_rooms
    where id = v_booking.listing_room_id
    for update;
    if not found then
      raise exception 'The selected room offer no longer exists.' using errcode = '22023';
    end if;
    if v_room_quantity is not null then
      select count(*) into v_reserved_count
      from public.bookings
      where listing_room_id = v_booking.listing_room_id
        and status in ('accepted', 'paid');
      if v_reserved_count >= v_room_quantity then
        raise exception 'The room quantity has already been accepted for other students.'
          using errcode = '22023';
      end if;
    end if;
  end if;

  update public.bookings set status = v_next_status where id = p_booking_id;
  insert into public.booking_events (booking_id, actor_user_id, previous_status, new_status)
  values (p_booking_id, auth.uid(), v_booking.status, v_next_status);
end;
$$;

create function public.cancel_booking_request(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  select status into v_previous_status
  from public.bookings
  where id = p_booking_id and student_user_id = auth.uid()
    and status in ('requested', 'accepted')
  for update;
  if not found then
    raise exception 'Only an unpaid, pending booking request can be cancelled.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.payments
    where booking_id = p_booking_id and status in ('initializing', 'pending', 'succeeded')
  ) then
    raise exception 'A payment is in progress or completed; contact support before cancellation.'
      using errcode = '22023';
  end if;
  update public.bookings set status = 'cancelled' where id = p_booking_id;
  insert into public.booking_events (booking_id, actor_user_id, previous_status, new_status)
  values (p_booking_id, auth.uid(), v_previous_status, 'cancelled');
end;
$$;

create function public.begin_booking_payment(p_booking_id uuid, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_amount bigint;
begin
  if v_user_id is null or not public.is_active_user() or p_idempotency_key is null then
    raise exception 'A verified active student and idempotency key are required.' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and student_user_id = v_user_id
  for update;
  if not found or v_booking.status <> 'accepted' then
    raise exception 'Only an accepted booking can start payment.' using errcode = '22023';
  end if;

  select * into v_payment from public.payments
  where student_user_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then
    if v_payment.booking_id <> p_booking_id then
      raise exception 'Idempotency key was already used for a different booking.' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'id', v_payment.id, 'reference', v_payment.provider_reference,
      'amount_pesewas', v_payment.amount_pesewas, 'currency', v_payment.currency,
      'status', v_payment.status, 'authorization_url', v_payment.authorization_url
    );
  end if;

  if exists (
    select 1 from public.payments
    where booking_id = p_booking_id and status in ('initializing', 'pending', 'succeeded')
  ) then
    raise exception 'This booking already has an open or successful payment.' using errcode = '23505';
  end if;

  v_amount := round(v_booking.price_amount * 100)::bigint;
  if v_amount <= 0 then
    raise exception 'The booking amount is invalid.' using errcode = '22023';
  end if;

  insert into public.payments (
    booking_id, student_user_id, provider_reference, idempotency_key, amount_pesewas, currency
  ) values (
    p_booking_id, v_user_id, 'SS-' || replace(gen_random_uuid()::text, '-', ''),
    p_idempotency_key, v_amount, 'GHS'
  ) returning * into v_payment;

  return jsonb_build_object(
    'id', v_payment.id, 'reference', v_payment.provider_reference,
    'amount_pesewas', v_payment.amount_pesewas, 'currency', v_payment.currency,
    'status', v_payment.status, 'authorization_url', v_payment.authorization_url
  );
end;
$$;

create function public.apply_verified_paystack_payment(
  p_reference text,
  p_amount_pesewas bigint,
  p_currency text,
  p_gateway_transaction_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Payment verification is restricted to the trusted server.' using errcode = '42501';
  end if;

  select * into v_payment from public.payments
  where provider_reference = p_reference
  for update;
  if not found then
    raise exception 'Payment reference not found.' using errcode = '22023';
  end if;
  if v_payment.status = 'succeeded' then
    if v_payment.amount_pesewas <> p_amount_pesewas
      or v_payment.currency <> p_currency then
      raise exception 'Repeated payment verification does not match the recorded transaction.'
        using errcode = '22023';
    end if;
    return v_payment.booking_id;
  end if;
  if v_payment.status not in ('initializing', 'pending') then
    raise exception 'Payment attempt is no longer payable.' using errcode = '22023';
  end if;
  if v_payment.amount_pesewas <> p_amount_pesewas
    or v_payment.currency <> p_currency
    or p_currency <> 'GHS'
    or p_gateway_transaction_id is null
    or char_length(p_gateway_transaction_id) > 160 then
    raise exception 'Verified gateway amount, currency, or transaction is invalid.'
      using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if not found or v_booking.student_user_id <> v_payment.student_user_id
    or v_booking.status <> 'accepted' then
    raise exception 'Payment does not match an accepted booking.' using errcode = '22023';
  end if;

  update public.payments set
    status = 'succeeded',
    gateway_transaction_id = p_gateway_transaction_id,
    verified_at = now(),
    failure_reason = null
  where id = v_payment.id;
  update public.bookings set status = 'paid' where id = v_booking.id;
  insert into public.booking_events (booking_id, previous_status, new_status, note)
  values (v_booking.id, v_booking.status, 'paid', 'Paystack transaction verified server-side.');
  return v_booking.id;
end;
$$;

create function public.mark_paystack_initialization_failed(
  p_payment_id uuid,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Payment initialization updates require the trusted server.' using errcode = '42501';
  end if;
  update public.payments
  set status = 'failed',
      failure_reason = left(coalesce(p_failure_reason, 'Payment initialization failed.'), 500)
  where id = p_payment_id and status = 'initializing';
end;
$$;

create function public.mark_paystack_payment_failed(
  p_reference text,
  p_gateway_transaction_id text,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role'
    or p_reference is null
    or p_gateway_transaction_id is null
    or char_length(p_gateway_transaction_id) > 160 then
    raise exception 'A verified transaction and trusted payment server are required.'
      using errcode = '42501';
  end if;

  update public.payments
  set status = 'failed',
      gateway_transaction_id = p_gateway_transaction_id,
      failure_reason = left(coalesce(p_failure_reason, 'Paystack reported a failed transaction.'), 500)
  where provider_reference = p_reference
    and status in ('initializing', 'pending');
  if not found and not exists (
    select 1 from public.payments
    where provider_reference = p_reference
      and status = 'failed'
      and gateway_transaction_id = p_gateway_transaction_id
  ) then
    raise exception 'Payment is not in a state that can be marked failed.' using errcode = '22023';
  end if;
end;
$$;

create function public.complete_paystack_initialization(
  p_payment_id uuid,
  p_authorization_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role'
    or p_authorization_url !~ '^https://'
    or char_length(p_authorization_url) > 2000 then
    raise exception 'A trusted payment server and valid authorization URL are required.'
      using errcode = '42501';
  end if;
  update public.payments set status = 'pending', authorization_url = p_authorization_url
  where id = p_payment_id and status = 'initializing';
  if not found then
    raise exception 'Payment initialization is no longer pending.' using errcode = '22023';
  end if;
end;
$$;

create function public.admin_moderate_review(
  p_review_id uuid,
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
  if not public.has_role('admin') or p_status not in ('published', 'rejected') then
    raise exception 'Administrator permission and a valid decision are required.'
      using errcode = '42501';
  end if;
  update public.reviews
  set status = p_status, moderation_reason = case when p_status = 'rejected' then left(p_reason, 1000) else null end
  where id = p_review_id and status = 'pending'
  returning status into v_previous_status;
  if not found then
    raise exception 'Only a pending review can be moderated.' using errcode = '22023';
  end if;
  insert into public.platform_audit_events (
    actor_user_id, action, resource_type, resource_id, details
  ) values (
    auth.uid(), 'review.' || p_status, 'review', p_review_id,
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 1000))
  );
end;
$$;

create function public.admin_resolve_listing_report(
  p_report_id uuid,
  p_status text,
  p_resolution_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin')
    or p_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'Administrator permission and a valid report status are required.'
      using errcode = '42501';
  end if;
  update public.listing_reports
  set status = p_status,
      resolution_note = left(coalesce(p_resolution_note, ''), 3000),
      resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() else null end,
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
  where id = p_report_id and status in ('open', 'reviewing');
  if not found then
    raise exception 'Open report not found.' using errcode = '22023';
  end if;
  insert into public.platform_audit_events (
    actor_user_id, action, resource_type, resource_id, details
  ) values (
    auth.uid(), 'report.' || p_status, 'listing_report', p_report_id,
    jsonb_build_object('resolution_note', left(coalesce(p_resolution_note, ''), 1000))
  );
end;
$$;

create function public.admin_set_account_status(p_user_id uuid, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_active_admins bigint;
begin
  if not public.has_role('admin')
    or p_status not in ('active', 'suspended', 'closed')
    or p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Administrator permission, status, and a reason are required.'
      using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Administrators cannot change their own account status.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id and r.role_key = 'admin'
  ) into v_is_admin;
  if v_is_admin and p_status <> 'active' then
    select count(*) into v_active_admins from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where r.role_key = 'admin' and p.account_status = 'active';
    if v_active_admins <= 1 then
      raise exception 'The last active administrator cannot be suspended or closed.'
        using errcode = '22023';
    end if;
  end if;

  update public.profiles set account_status = p_status where id = p_user_id;
  if not found then
    raise exception 'User profile not found.' using errcode = '22023';
  end if;
  insert into public.platform_audit_events (
    actor_user_id, action, resource_type, resource_id, details
  ) values (
    auth.uid(), 'account.' || p_status, 'profile', p_user_id,
    jsonb_build_object('reason', left(p_reason, 1000))
  );
end;
$$;

alter table public.enquiries enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.listing_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_audit_events enable row level security;

revoke all on public.enquiries, public.bookings, public.booking_events, public.payments,
  public.reviews, public.listing_reports, public.notifications, public.platform_audit_events
  from anon, authenticated;
grant select on public.enquiries, public.bookings, public.booking_events,
  public.listing_reports, public.notifications to authenticated;
grant select (id, listing_id, rating, body, status, created_at, updated_at)
  on public.reviews to anon, authenticated;
grant select (
  id, booking_id, student_user_id, provider_reference, amount_pesewas,
  currency, status, verified_at, created_at, updated_at
) on public.payments to authenticated;
grant insert (
  listing_id, property_id, provider_business_id, student_user_id, student_name,
  student_email, student_phone, message, viewing_date, idempotency_key
) on public.enquiries to authenticated;
grant update (status) on public.enquiries to authenticated;
grant insert (
  listing_id, property_id, provider_business_id, listing_room_id, student_user_id,
  move_in_date, price_amount, currency, pricing_period, idempotency_key
) on public.bookings to authenticated;
grant insert (booking_id, listing_id, student_user_id, rating, body)
  on public.reviews to authenticated;
grant insert (listing_id, reporter_user_id, reason, message)
  on public.listing_reports to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant execute on function public.provider_update_booking_status(uuid, text) to authenticated;
grant execute on function public.cancel_booking_request(uuid) to authenticated;
grant execute on function public.begin_booking_payment(uuid, uuid) to authenticated;
grant execute on function public.admin_moderate_review(uuid, text, text) to authenticated;
grant execute on function public.admin_resolve_listing_report(uuid, text, text) to authenticated;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;
grant execute on function public.record_platform_audit_event(text, text, uuid, jsonb) to authenticated;
grant execute on function public.apply_verified_paystack_payment(text, bigint, text, text) to service_role;
grant execute on function public.mark_paystack_initialization_failed(uuid, text) to service_role;
grant execute on function public.mark_paystack_payment_failed(text, text, text) to service_role;
grant execute on function public.complete_paystack_initialization(uuid, text) to service_role;

create policy "Students and managing providers read enquiries"
  on public.enquiries for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or (select public.is_business_member(
      provider_business_id, array['owner', 'manager', 'editor']::text[]
    ))
    or (select public.has_role('admin'))
  );
create policy "Students submit enquiries to published listings"
  on public.enquiries for insert to authenticated
  with check (
    student_user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1 from public.listings listing
      join public.properties property on property.id = listing.property_id
      where listing.id = enquiries.listing_id
        and listing.property_id = enquiries.property_id
        and property.provider_business_id = enquiries.provider_business_id
        and listing.status = 'published'
    )
  );
create policy "Listing managers update enquiry status"
  on public.enquiries for update to authenticated
  using (
    (select public.is_business_member(
      provider_business_id, array['owner', 'manager']::text[]
    ))
    and status <> 'closed'
  )
  with check (
    (select public.is_business_member(
      provider_business_id, array['owner', 'manager']::text[]
    ))
  );

create policy "Booking participants and administrators read bookings"
  on public.bookings for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or (select public.is_business_member(
      provider_business_id, array['owner', 'manager', 'editor']::text[]
    ))
    or (select public.has_role('admin'))
  );
create policy "Students request rooms on published listings"
  on public.bookings for insert to authenticated
  with check (
    student_user_id = (select auth.uid())
    and status = 'requested'
    and (select public.is_active_user())
    and move_in_date >= current_date
    and exists (
      select 1
      from public.listings listing
      join public.properties property on property.id = listing.property_id
      join public.listing_rooms room on room.listing_id = listing.id
      where listing.id = bookings.listing_id
        and listing.property_id = bookings.property_id
        and property.provider_business_id = bookings.provider_business_id
        and room.id = bookings.listing_room_id
        and listing.status = 'published'
        and room.is_active
        and (room.available_quantity is null or room.available_quantity > 0)
        and room.price_amount = bookings.price_amount
        and room.currency = bookings.currency
        and room.pricing_period = bookings.pricing_period
    )
  );

create policy "Booking participants read history"
  on public.booking_events for select to authenticated
  using (
    exists (
      select 1 from public.bookings booking where booking.id = booking_events.booking_id
        and (
          booking.student_user_id = (select auth.uid())
          or (select public.is_business_member(
            booking.provider_business_id, array['owner', 'manager', 'editor']::text[]
          ))
          or (select public.has_role('admin'))
        )
    )
  );

create policy "Payment participants read transaction status"
  on public.payments for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or exists (
      select 1 from public.bookings booking
      where booking.id = payments.booking_id
        and (select public.is_business_member(
          booking.provider_business_id, array['owner', 'manager']::text[]
        ))
    )
    or (select public.has_role('admin'))
  );

create policy "Review authors and administrators read their reviews"
  on public.reviews for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or status = 'published'
    or (select public.has_role('admin'))
  );
create policy "Anonymous users read published reviews"
  on public.reviews for select to anon using (status = 'published');
create policy "Students review completed bookings once"
  on public.reviews for insert to authenticated
  with check (
    student_user_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.bookings booking
      where booking.id = reviews.booking_id
        and booking.listing_id = reviews.listing_id
        and booking.student_user_id = (select auth.uid())
        and booking.status = 'completed'
    )
  );

create policy "Reporters and administrators read reports"
  on public.listing_reports for select to authenticated
  using (reporter_user_id = (select auth.uid()) or (select public.has_role('admin')));
create policy "Active students report listings"
  on public.listing_reports for insert to authenticated
  with check (
    reporter_user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (select 1 from public.listings listing where listing.id = listing_reports.listing_id)
    and not (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create policy "Users read own notifications"
  on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Users mark own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Administrators read platform audit events"
  on public.platform_audit_events for select to authenticated
  using ((select public.has_role('admin')));

revoke all on function public.record_platform_audit_event(text, text, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.provider_update_booking_status(uuid, text)
  from public, anon;
revoke all on function public.cancel_booking_request(uuid) from public, anon;
revoke all on function public.begin_booking_payment(uuid, uuid) from public, anon;
revoke all on function public.apply_verified_paystack_payment(text, bigint, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_paystack_initialization_failed(uuid, text)
  from public, anon, authenticated;
revoke all on function public.mark_paystack_payment_failed(text, text, text)
  from public, anon, authenticated;
revoke all on function public.complete_paystack_initialization(uuid, text)
  from public, anon, authenticated;
revoke all on function public.admin_moderate_review(uuid, text, text) from public, anon;
revoke all on function public.admin_resolve_listing_report(uuid, text, text) from public, anon;
revoke all on function public.admin_set_account_status(uuid, text, text) from public, anon;
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

-- Listing objects remain private; object reads require both a published,
-- processed media row and a path match. Uploads are allowed only before publish.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media',
  'listing-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Published listing images are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'listing-media'
    and exists (
      select 1 from public.listing_media media
      join public.listings listing on listing.id = media.listing_id
      where media.storage_bucket = storage.objects.bucket_id
        and media.storage_path = storage.objects.name
        and media.kind = 'image'
        and media.processing_status = 'ready'
        and listing.status = 'published'
    )
  );
create policy "Providers read their unpublished listing images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-media'
    and exists (
      select 1 from public.listings listing
      where listing.id::text = (storage.foldername(storage.objects.name))[1]
        and listing.status in ('draft', 'pending_approval', 'rejected')
        and (select public.is_listing_business_member(listing.id, null))
    )
  );
create policy "Business members upload to unpublished listings"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-media'
    and exists (
      select 1 from public.listings listing
      where listing.id::text = (storage.foldername(storage.objects.name))[1]
        and listing.status in ('draft', 'pending_approval', 'rejected')
        and (select public.is_listing_business_member(
          listing.id, array['owner', 'manager', 'editor']::text[]
        ))
    )
  );
create policy "Business members update unpublished listing images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-media'
    and exists (
      select 1 from public.listings listing
      where listing.id::text = (storage.foldername(storage.objects.name))[1]
        and listing.status in ('draft', 'pending_approval', 'rejected')
        and (select public.is_listing_business_member(
          listing.id, array['owner', 'manager', 'editor']::text[]
        ))
    )
  )
  with check (
    bucket_id = 'listing-media'
    and exists (
      select 1 from public.listings listing
      where listing.id::text = (storage.foldername(storage.objects.name))[1]
        and listing.status in ('draft', 'pending_approval', 'rejected')
        and (select public.is_listing_business_member(
          listing.id, array['owner', 'manager', 'editor']::text[]
        ))
    )
  );
create policy "Business members delete unpublished listing images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-media'
    and exists (
      select 1 from public.listings listing
      where listing.id::text = (storage.foldername(storage.objects.name))[1]
        and listing.status in ('draft', 'pending_approval', 'rejected')
        and (select public.is_listing_business_member(
          listing.id, array['owner', 'manager']::text[]
        ))
    )
  );
