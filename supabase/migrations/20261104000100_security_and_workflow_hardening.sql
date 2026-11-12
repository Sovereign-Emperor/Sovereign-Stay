-- Provision required catalogues during migration deployment, not only local
-- database resets that happen to run supabase/seed.sql.
insert into public.roles (role_key, display_name)
values
  ('student', 'Student'),
  ('provider', 'Provider'),
  ('admin', 'Administrator')
on conflict (role_key) do nothing;

insert into public.room_types (type_key, display_name, default_occupancy)
values
  ('single', '1 in a room', 1),
  ('double', '2 in a room', 2),
  ('triple', '3 in a room', 3),
  ('quad', '4 in a room', 4)
on conflict (type_key) do nothing;

insert into public.facilities (facility_key, display_name)
values
  ('wifi', 'Wi-Fi'),
  ('water', 'Water'),
  ('security', 'Security'),
  ('study-area', 'Study area'),
  ('kitchen', 'Kitchen'),
  ('laundry', 'Laundry'),
  ('private-bathroom', 'Private bathroom'),
  ('air-conditioning', 'Air conditioning')
on conflict (facility_key) do nothing;

-- Repair profiles from before the auth trigger was installed. Only grant the
-- student role to users without an existing role or provider membership.
insert into public.profiles (id, display_name)
select
  auth_user.id,
  nullif(left(btrim(coalesce(auth_user.raw_user_meta_data ->> 'display_name', '')), 120), '')
from auth.users as auth_user
on conflict (id) do nothing;

insert into public.user_roles (user_id, role_id)
select auth_user.id, student_role.id
from auth.users as auth_user
join public.roles as student_role on student_role.role_key = 'student'
where not exists (
    select 1 from public.user_roles as existing_role
    where existing_role.user_id = auth_user.id
  )
  and not exists (
    select 1 from public.provider_business_memberships as membership
    where membership.user_id = auth_user.id
  )
on conflict (user_id, role_id) do nothing;

-- Exact street addresses are available only to admins, the managing business,
-- or students with an accepted, paid, or completed booking for that property.
revoke select (address) on public.properties from authenticated;

create function public.get_authorized_property_addresses(p_property_ids uuid[])
returns table (property_id uuid, exact_address text)
language sql
stable
security definer
set search_path = ''
as $$
  select property.id, property.address
  from public.properties as property
  where property.id = any (p_property_ids)
    and public.is_active_user()
    and (
      public.has_role('admin')
      or public.is_business_member(property.provider_business_id, null)
      or exists (
        select 1
        from public.bookings as booking
        where booking.property_id = property.id
          and booking.student_user_id = auth.uid()
          and booking.status in ('accepted', 'paid', 'completed')
      )
    );
$$;
revoke all on function public.get_authorized_property_addresses(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_authorized_property_addresses(uuid[])
  to authenticated;

-- Direct table inserts must enforce the same active-student role as the RPCs.
drop policy "Students submit enquiries to published listings" on public.enquiries;
create policy "Students submit enquiries to published listings"
  on public.enquiries for insert to authenticated
  with check (
    student_user_id = (select auth.uid())
    and (select public.is_active_user())
    and (select public.has_role('student'))
    and exists (
      select 1 from public.listings as listing
      join public.properties as property on property.id = listing.property_id
      where listing.id = enquiries.listing_id
        and listing.property_id = enquiries.property_id
        and property.provider_business_id = enquiries.provider_business_id
        and listing.status = 'published'
    )
  );

drop policy "Students request rooms on published listings" on public.bookings;
create policy "Students request rooms on published listings"
  on public.bookings for insert to authenticated
  with check (
    student_user_id = (select auth.uid())
    and status = 'requested'
    and (select public.is_active_user())
    and (select public.has_role('student'))
    and move_in_date >= current_date
    and exists (
      select 1
      from public.listings as listing
      join public.properties as property on property.id = listing.property_id
      join public.listing_rooms as room on room.listing_id = listing.id
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

drop policy "Active students report listings" on public.listing_reports;
create policy "Active students report published listings"
  on public.listing_reports for insert to authenticated
  with check (
    reporter_user_id = (select auth.uid())
    and (select public.is_active_user())
    and (select public.has_role('student'))
    and exists (
      select 1 from public.listings as listing
      where listing.id = listing_reports.listing_id
        and listing.status = 'published'
    )
    and not (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

-- Generic audit recording is a server operation. Admin moderation RPCs write
-- their own actor-attributed events directly and remain unchanged.
create or replace function public.record_platform_audit_event(
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Platform audit recording is restricted to the trusted server.'
      using errcode = '42501';
  end if;
  insert into public.platform_audit_events (
    actor_user_id, action, resource_type, resource_id, details
  ) values (
    null, p_action, p_resource_type, p_resource_id, coalesce(p_details, '{}'::jsonb)
  );
end;
$$;
revoke all on function public.record_platform_audit_event(text, text, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.record_platform_audit_event(text, text, uuid, jsonb)
  to service_role;

-- A Paystack transaction may be attached to exactly one payment. This also
-- makes repeated webhook delivery safe to acknowledge without double effects.
create unique index payments_gateway_transaction_id_unique_idx
  on public.payments (gateway_transaction_id)
  where gateway_transaction_id is not null;

create or replace function public.apply_verified_paystack_payment(
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
  if coalesce(auth.role(), '') <> 'service_role'
    or p_reference is null
    or p_reference !~ '^SS-[0-9a-f]{32}$'
    or p_amount_pesewas is null
    or p_amount_pesewas <= 0
    or p_currency is distinct from 'GHS'
    or p_gateway_transaction_id is null
    or p_gateway_transaction_id !~ '^[0-9]{1,160}$' then
    raise exception 'A valid verified transaction and trusted payment server are required.'
      using errcode = '42501';
  end if;

  select * into v_payment
  from public.payments
  where provider_reference = p_reference
  for update;
  if not found then
    raise exception 'Payment reference not found.' using errcode = '22023';
  end if;
  if v_payment.amount_pesewas <> p_amount_pesewas
    or v_payment.currency <> p_currency then
    raise exception 'Verified gateway amount or currency does not match the payment.'
      using errcode = '22023';
  end if;
  if v_payment.status = 'succeeded' then
    if v_payment.gateway_transaction_id is distinct from p_gateway_transaction_id then
      raise exception 'Repeated payment verification has a different gateway transaction.'
        using errcode = '22023';
    end if;
    return v_payment.booking_id;
  end if;
  if v_payment.status not in ('initializing', 'pending') then
    raise exception 'Payment attempt is no longer payable.' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = v_payment.booking_id
  for update;
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

create function public.mark_verified_paystack_payment_failed(
  p_reference text,
  p_amount_pesewas bigint,
  p_currency text,
  p_gateway_transaction_id text,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    or p_reference is null
    or p_reference !~ '^SS-[0-9a-f]{32}$'
    or p_amount_pesewas is null
    or p_amount_pesewas <= 0
    or p_currency is distinct from 'GHS'
    or p_gateway_transaction_id is null
    or p_gateway_transaction_id !~ '^[0-9]{1,160}$' then
    raise exception 'A valid verified transaction and trusted payment server are required.'
      using errcode = '42501';
  end if;

  select * into v_payment
  from public.payments
  where provider_reference = p_reference
  for update;
  if not found
    or v_payment.amount_pesewas <> p_amount_pesewas
    or v_payment.currency <> p_currency then
    raise exception 'Verified gateway transaction does not match a payment.'
      using errcode = '22023';
  end if;
  if v_payment.status = 'failed' then
    if v_payment.gateway_transaction_id is distinct from p_gateway_transaction_id then
      raise exception 'Repeated failed-payment verification has a different transaction.'
        using errcode = '22023';
    end if;
    return;
  end if;
  if v_payment.status not in ('initializing', 'pending') then
    raise exception 'Payment attempt cannot be marked failed from its current state.'
      using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = v_payment.booking_id
  for update;
  if not found or v_booking.student_user_id <> v_payment.student_user_id
    or v_booking.status <> 'accepted' then
    raise exception 'Payment does not match an accepted booking.' using errcode = '22023';
  end if;

  update public.payments
  set status = 'failed',
      gateway_transaction_id = p_gateway_transaction_id,
      failure_reason = left(coalesce(p_failure_reason, 'Paystack reported a failed transaction.'), 500)
  where id = v_payment.id;
end;
$$;

-- Retire the older service-only failure API; callers must supply the
-- Paystack-verified amount and currency to the stricter replacement.
revoke all on function public.mark_paystack_payment_failed(text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.apply_verified_paystack_payment(text, bigint, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.apply_verified_paystack_payment(text, bigint, text, text)
  to service_role;
revoke all on function public.mark_verified_paystack_payment_failed(text, bigint, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_verified_paystack_payment_failed(text, bigint, text, text, text)
  to service_role;

revoke all on function public.mark_paystack_initialization_failed(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_paystack_initialization_failed(uuid, text)
  to service_role;
revoke all on function public.complete_paystack_initialization(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_paystack_initialization(uuid, text)
  to service_role;
revoke all on function public.configure_booking_payment_amount(uuid, uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.configure_booking_payment_amount(uuid, uuid, integer)
  to service_role;

-- Preserve room IDs referenced by availability and booking history. Existing
-- referenced offers may be retired, but their historical terms cannot change.
revoke insert, update, delete on public.listing_rooms from authenticated;
revoke insert (
  listing_id, room_type_id, label, price_amount, currency,
  pricing_period, occupancy, available_quantity, is_active
), update (
  room_type_id, label, price_amount, currency, pricing_period,
  occupancy, available_quantity, is_active
) on public.listing_rooms from authenticated;

create or replace function public.save_provider_listing(
  p_listing_id uuid,
  p_values jsonb,
  p_rooms jsonb,
  p_facility_names text[],
  p_submit_for_review boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_property_id uuid := (p_values ->> 'propertyId')::uuid;
  v_listing_id uuid := p_listing_id;
  v_listing_status text;
  v_room jsonb;
  v_room_type_id uuid;
  v_room_id uuid;
  v_room_ids uuid[] := '{}';
  v_room_label text;
  v_room_description text;
  v_room_price numeric(12, 2);
  v_room_period text;
  v_room_occupancy integer;
  v_room_quantity integer;
  v_room_deposit numeric(12, 2);
  v_room_features text;
  v_room_availability text;
  v_existing_room public.listing_rooms%rowtype;
  v_reserved_count bigint;
  v_facility_id uuid;
begin
  if v_user_id is null or not public.is_active_user()
    or coalesce(jsonb_typeof(p_rooms), '') <> 'array' then
    raise exception 'An active account and valid room list are required.'
      using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_values ->> 'name', ''))) not between 1 and 200
    or char_length(btrim(coalesce(p_values ->> 'description', ''))) < 1
    or char_length(btrim(coalesce(p_values ->> 'accommodationCategory', ''))) < 1
    or char_length(btrim(coalesce(p_values ->> 'locationSummary', ''))) < 1 then
    raise exception 'Listing headline, description, accommodation category, and location are required.'
      using errcode = '22023';
  end if;
  if not public.is_property_business_member(
    v_property_id, array['owner', 'manager', 'editor']::text[]
  ) then
    raise exception 'The selected property is not managed by this account.'
      using errcode = '42501';
  end if;
  if p_submit_for_review and jsonb_array_length(p_rooms) = 0 then
    raise exception 'Add a room offer before submitting the listing for review.'
      using errcode = '22023';
  end if;

  if p_listing_id is null then
    insert into public.listings (
      property_id, name, description, created_by, accommodation_category, location_summary,
      nearby_institution, available_from, availability_status,
      included_utilities, house_rules, deposit_requirements,
      contact_preference, viewing_preference
    ) values (
      v_property_id, btrim(p_values ->> 'name'), btrim(p_values ->> 'description'),
      v_user_id, btrim(p_values ->> 'accommodationCategory'), btrim(p_values ->> 'locationSummary'),
      coalesce(p_values ->> 'institution', ''),
      nullif(p_values ->> 'availableFrom', '')::date,
      coalesce(p_values ->> 'availabilityStatus', 'unknown'),
      coalesce(p_values ->> 'utilities', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_values -> 'houseRules', '[]'::jsonb))), '{}'),
      coalesce(p_values ->> 'depositRequirements', ''),
      coalesce(p_values ->> 'contactPreference', 'enquiry'),
      coalesce(p_values ->> 'viewingPreference', '')
    ) returning id into v_listing_id;
  else
    select status into v_listing_status
    from public.listings as listing
    where listing.id = p_listing_id
      and listing.property_id = v_property_id
      and public.is_listing_business_member(
        listing.id, array['owner', 'manager', 'editor']::text[]
      )
    for update;
    if not found or v_listing_status not in ('draft', 'rejected') then
      raise exception 'Only a draft or rejected listing managed by this account can be edited.'
        using errcode = '42501';
    end if;
    update public.listings set
      name = btrim(p_values ->> 'name'),
      description = btrim(p_values ->> 'description'),
      accommodation_category = btrim(p_values ->> 'accommodationCategory'),
      location_summary = btrim(p_values ->> 'locationSummary'),
      nearby_institution = coalesce(p_values ->> 'institution', ''),
      available_from = nullif(p_values ->> 'availableFrom', '')::date,
      availability_status = coalesce(p_values ->> 'availabilityStatus', 'unknown'),
      included_utilities = coalesce(p_values ->> 'utilities', ''),
      house_rules = coalesce(array(select jsonb_array_elements_text(coalesce(p_values -> 'houseRules', '[]'::jsonb))), '{}'),
      deposit_requirements = coalesce(p_values ->> 'depositRequirements', ''),
      contact_preference = coalesce(p_values ->> 'contactPreference', 'enquiry'),
      viewing_preference = coalesce(p_values ->> 'viewingPreference', '')
    where id = v_listing_id;
    delete from public.listing_facilities where listing_id = v_listing_id;
  end if;

  for v_room in select value from jsonb_array_elements(p_rooms)
  loop
    v_room_id := nullif(v_room ->> 'id', '')::uuid;
    v_room_label := btrim(coalesce(v_room ->> 'roomType', ''));
    v_room_description := coalesce(v_room ->> 'description', '');
    v_room_price := nullif(v_room ->> 'price', '')::numeric;
    v_room_period := case v_room ->> 'period'
      when 'monthly' then 'month'
      else coalesce(v_room ->> 'period', '')
    end;
    v_room_occupancy := coalesce((v_room ->> 'occupancy')::integer, 0);
    v_room_quantity := coalesce((v_room ->> 'quantity')::integer, -1);
    v_room_deposit := nullif(v_room ->> 'deposit', '')::numeric;
    v_room_features := coalesce(v_room ->> 'features', '');
    v_room_availability := coalesce(v_room ->> 'availabilityStatus', 'unknown');

    if v_room_label = ''
      or v_room_occupancy < 1
      or v_room_quantity < 0
      or v_room_price is null
      or v_room_price <= 0
      or v_room_period not in ('month', 'semester', 'academic_year', 'other')
      or v_room_availability not in ('unknown', 'available', 'limited', 'unavailable')
      or (v_room_deposit is not null and v_room_deposit < 0) then
      raise exception 'Room offers must have a type, positive price and occupancy, nonnegative quantity, and valid rental period.'
        using errcode = '22023';
    end if;

    select id into v_room_type_id
    from public.room_types
    where display_name = v_room_label or type_key = v_room_label
    limit 1;
    if v_room_type_id is null then
      raise exception 'The room type is not in the supported catalogue.' using errcode = '22023';
    end if;

    if v_room_id is not null then
      if v_room_id = any (v_room_ids) then
        raise exception 'A room offer may be submitted only once.' using errcode = '22023';
      end if;
      select * into v_existing_room
      from public.listing_rooms
      where id = v_room_id and listing_id = v_listing_id
      for update;
      if not found then
        raise exception 'The room offer does not belong to this listing.'
          using errcode = '42501';
      end if;

      if exists (
        select 1 from public.bookings as booking
        where booking.listing_room_id = v_room_id
      ) then
        if v_existing_room.room_type_id is distinct from v_room_type_id
          or v_existing_room.label is distinct from v_room_label
          or v_existing_room.description is distinct from v_room_description
          or v_existing_room.price_amount is distinct from v_room_price
          or v_existing_room.currency is distinct from 'GHS'
          or v_existing_room.pricing_period is distinct from v_room_period
          or v_existing_room.occupancy is distinct from v_room_occupancy
          or v_existing_room.deposit_amount is distinct from v_room_deposit
          or v_existing_room.features is distinct from v_room_features then
          raise exception 'A room offer referenced by booking history cannot have its terms changed. Add a new room offer instead.'
            using errcode = '22023';
        end if;
        select count(*) into v_reserved_count
        from public.bookings as booking
        where booking.listing_room_id = v_room_id
          and booking.status in ('accepted', 'paid');
        if v_room_quantity < v_reserved_count then
          raise exception 'Room quantity cannot be lower than accepted or paid bookings.'
            using errcode = '22023';
        end if;
        update public.listing_rooms set
          available_quantity = v_room_quantity,
          availability_status = v_room_availability,
          is_active = true
        where id = v_room_id;
      else
        update public.listing_rooms set
          room_type_id = v_room_type_id,
          label = v_room_label,
          description = v_room_description,
          price_amount = v_room_price,
          currency = 'GHS',
          pricing_period = v_room_period,
          occupancy = v_room_occupancy,
          available_quantity = v_room_quantity,
          deposit_amount = v_room_deposit,
          features = v_room_features,
          availability_status = v_room_availability,
          is_active = true
        where id = v_room_id;
      end if;
    else
      insert into public.listing_rooms (
        listing_id, room_type_id, label, description, price_amount, currency,
        pricing_period, occupancy, available_quantity, deposit_amount,
        features, availability_status, is_active
      ) values (
        v_listing_id, v_room_type_id, v_room_label, v_room_description,
        v_room_price, 'GHS', v_room_period, v_room_occupancy,
        v_room_quantity, v_room_deposit, v_room_features, v_room_availability, true
      ) returning id into v_room_id;
    end if;
    v_room_ids := array_append(v_room_ids, v_room_id);
  end loop;

  update public.listing_rooms
  set is_active = false
  where listing_id = v_listing_id
    and not (id = any (v_room_ids))
    and is_active;

  if coalesce(array_length(p_facility_names, 1), 0) > 0 then
    for v_facility_id in
      select facility.id
      from public.facilities as facility
      where facility.display_name = any (p_facility_names)
    loop
      insert into public.listing_facilities (listing_id, facility_id)
      values (v_listing_id, v_facility_id);
    end loop;
    if (select count(*) from public.listing_facilities where listing_id = v_listing_id)
      <> array_length(p_facility_names, 1) then
      raise exception 'One or more selected facilities are not in the supported catalogue.'
        using errcode = '22023';
    end if;
  end if;

  if p_submit_for_review then
    perform public.submit_listing_for_review(v_listing_id);
  end if;
  return v_listing_id;
end;
$$;

revoke all on function public.save_provider_listing(uuid, jsonb, jsonb, text[], boolean)
  from public, anon;
grant execute on function public.save_provider_listing(uuid, jsonb, jsonb, text[], boolean)
  to authenticated;
