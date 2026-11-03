-- Add the fields and transactional operations needed to connect the existing
-- marketplace forms without modifying the already-recorded schema history.

alter table public.properties
  add column if not exists address text not null default '';

alter table public.listings
  add column if not exists accommodation_category text not null default '',
  add column if not exists location_summary text not null default '',
  add column if not exists nearby_institution text not null default '',
  add column if not exists available_from date,
  add column if not exists availability_status text not null default 'unknown'
    check (availability_status in ('unknown', 'available', 'limited', 'unavailable')),
  add column if not exists included_utilities text not null default '',
  add column if not exists house_rules text[] not null default '{}',
  add column if not exists deposit_requirements text not null default '',
  add column if not exists contact_preference text not null default 'enquiry'
    check (contact_preference in ('enquiry', 'phone', 'whatsapp')),
  add column if not exists viewing_preference text not null default '';

alter table public.listing_rooms
  add column if not exists description text not null default '',
  add column if not exists deposit_amount numeric(12, 2)
    check (deposit_amount is null or deposit_amount >= 0),
  add column if not exists features text not null default '',
  add column if not exists availability_status text not null default 'unknown'
    check (availability_status in ('unknown', 'available', 'limited', 'unavailable'));

alter table public.listing_rooms
  drop constraint if exists listing_rooms_pricing_period_check;
alter table public.listing_rooms
  add constraint listing_rooms_pricing_period_check
  check (pricing_period in ('night', 'month', 'monthly', 'semester', 'academic_year', 'other'));

alter table public.bookings
  drop constraint if exists bookings_pricing_period_check;
alter table public.bookings
  add constraint bookings_pricing_period_check
  check (pricing_period in ('night', 'month', 'monthly', 'semester', 'academic_year', 'other'));

create table public.listing_facilities (
  listing_id uuid not null references public.listings (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (listing_id, facility_id)
);
alter table public.listing_facilities enable row level security;
revoke all on public.listing_facilities from anon, authenticated;
grant select on public.listing_facilities to anon, authenticated;
grant insert, delete on public.listing_facilities to authenticated;

create policy "Public and authorized users read listing facilities"
  on public.listing_facilities for select to anon, authenticated
  using (
    (select public.is_listing_public(listing_id))
    or (select public.is_listing_business_member(listing_id, null))
    or (select public.has_role('admin'))
  );
create policy "Listing managers add facilities before publication"
  on public.listing_facilities for insert to authenticated
  with check (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );
create policy "Listing managers remove facilities before publication"
  on public.listing_facilities for delete to authenticated
  using (
    not (select public.is_listing_public(listing_id))
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
  );

create unique index if not exists bookings_one_active_room_per_student_idx
  on public.bookings (student_user_id, listing_room_id)
  where status in ('requested', 'accepted', 'paid');

create function public.save_provider_property(p_values jsonb, p_property_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_location_id uuid;
  v_property_id uuid;
  v_area text := btrim(coalesce(p_values ->> 'area', ''));
  v_city text := btrim(coalesce(p_values ->> 'city', ''));
  v_region text := btrim(coalesce(p_values ->> 'region', ''));
  v_label text;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'An active verified account is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_values ->> 'name', ''))) not between 1 and 200
    or char_length(btrim(coalesce(p_values ->> 'type', ''))) not between 1 and 80
    or v_area = '' or v_city = '' or v_region = '' then
    raise exception 'Property name, type, area, city, and region are required.'
      using errcode = '22023';
  end if;

  if p_property_id is null then
    select membership.provider_business_id into v_business_id
    from public.provider_business_memberships membership
    where membership.user_id = v_user_id
      and membership.membership_role in ('owner', 'manager', 'editor')
    order by membership.created_at
    limit 1;
    if v_business_id is null then
      raise exception 'No provider business is associated with this account.'
        using errcode = '42501';
    end if;
  else
    select property.provider_business_id into v_business_id
    from public.properties property
    where property.id = p_property_id
      and public.is_business_member(
        property.provider_business_id, array['owner', 'manager', 'editor']::text[]
      );
    if v_business_id is null then
      raise exception 'Property not found or not managed by this account.'
        using errcode = '42501';
    end if;
  end if;

  v_label := v_area || ', ' || v_city || ', ' || v_region;
  insert into public.locations (label, area, city, region, country_code)
  values (v_label, v_area, v_city, v_region, 'GH')
  on conflict (label) do nothing
  returning id into v_location_id;
  if v_location_id is null then
    select id into v_location_id from public.locations where label = v_label;
  end if;

  if p_property_id is null then
    insert into public.properties (
      provider_business_id, location_id, name, property_type, description,
      address, created_by
    ) values (
      v_business_id, v_location_id, btrim(p_values ->> 'name'),
      btrim(p_values ->> 'type'), coalesce(p_values ->> 'description', ''),
      coalesce(p_values ->> 'address', ''), v_user_id
    ) returning id into v_property_id;
  else
    if exists (
      select 1 from public.listings listing
      where listing.property_id = p_property_id and listing.status = 'published'
    ) then
      raise exception 'Unpublish the listing before changing its physical property details.'
        using errcode = '22023';
    end if;
    update public.properties set
      location_id = v_location_id,
      name = btrim(p_values ->> 'name'),
      property_type = btrim(p_values ->> 'type'),
      description = coalesce(p_values ->> 'description', ''),
      address = coalesce(p_values ->> 'address', '')
    where id = p_property_id;
    v_property_id := p_property_id;
  end if;

  return v_property_id;
end;
$$;

create function public.save_provider_listing(
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
  v_facility_id uuid;
begin
  if v_user_id is null or not public.is_active_user()
    or jsonb_typeof(p_rooms) <> 'array' then
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
    select status into v_listing_status from public.listings listing
    where listing.id = p_listing_id and listing.property_id = v_property_id
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
    delete from public.listing_rooms where listing_id = v_listing_id;
    delete from public.listing_facilities where listing_id = v_listing_id;
  end if;

  for v_room in select value from jsonb_array_elements(p_rooms)
  loop
    if char_length(btrim(coalesce(v_room ->> 'roomType', ''))) = 0
      or coalesce((v_room ->> 'occupancy')::integer, 0) < 1
      or coalesce((v_room ->> 'quantity')::integer, -1) < 0
      or coalesce((v_room ->> 'price')::numeric, 0) <= 0
      or coalesce(v_room ->> 'period', '') not in ('monthly', 'semester', 'academic_year', 'other') then
      raise exception 'Room offers must have a type, positive price and occupancy, nonnegative quantity, and valid rental period.'
        using errcode = '22023';
    end if;
    select id into v_room_type_id from public.room_types
    where display_name = btrim(v_room ->> 'roomType')
      or type_key = btrim(v_room ->> 'roomType')
    limit 1;
    if v_room_type_id is null then
      raise exception 'The room type is not in the supported catalogue.' using errcode = '22023';
    end if;
    insert into public.listing_rooms (
      listing_id, room_type_id, label, description, price_amount, currency,
      pricing_period, occupancy, available_quantity, deposit_amount,
      features, availability_status, is_active
    ) values (
      v_listing_id, v_room_type_id, btrim(v_room ->> 'roomType'),
      coalesce(v_room ->> 'description', ''), (v_room ->> 'price')::numeric, 'GHS',
      case v_room ->> 'period' when 'monthly' then 'month' else v_room ->> 'period' end,
      (v_room ->> 'occupancy')::integer, (v_room ->> 'quantity')::integer,
      nullif(v_room ->> 'deposit', '')::numeric, coalesce(v_room ->> 'features', ''),
      coalesce(v_room ->> 'availabilityStatus', 'unknown'), true
    ) returning id into v_room_id;
  end loop;

  if coalesce(array_length(p_facility_names, 1), 0) > 0 then
    for v_facility_id in
      select facility.id from public.facilities facility
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

create function public.submit_listing_enquiry(
  p_listing_id uuid,
  p_student_name text,
  p_student_email text,
  p_student_phone text,
  p_message text,
  p_viewing_date date,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings%rowtype;
  v_business_id uuid;
  v_enquiry_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() or not public.has_role('student') then
    raise exception 'Sign in with a verified, active student account to send an enquiry.'
      using errcode = '42501';
  end if;
  if p_idempotency_key is null
    or char_length(btrim(coalesce(p_student_name, ''))) not between 1 and 120
    or char_length(btrim(coalesce(p_student_email, ''))) not between 3 and 320
    or char_length(btrim(coalesce(p_student_phone, ''))) not between 7 and 40
    or char_length(btrim(coalesce(p_message, ''))) not between 1 and 5000
    or (p_viewing_date is not null and p_viewing_date < current_date) then
    raise exception 'Enquiry details are invalid.' using errcode = '22023';
  end if;

  select listing.* into v_listing from public.listings listing
  where listing.id = p_listing_id and listing.status = 'published';
  if not found then
    raise exception 'This listing is not accepting enquiries.' using errcode = '22023';
  end if;
  select property.provider_business_id into v_business_id
  from public.properties property where property.id = v_listing.property_id;

  insert into public.enquiries (
    listing_id, property_id, provider_business_id, student_user_id,
    student_name, student_email, student_phone, message, viewing_date, idempotency_key
  ) values (
    v_listing.id, v_listing.property_id, v_business_id, auth.uid(),
    btrim(p_student_name), lower(btrim(p_student_email)), btrim(p_student_phone),
    btrim(p_message), p_viewing_date, p_idempotency_key
  )
  on conflict (student_user_id, listing_id, idempotency_key)
  do update set idempotency_key = excluded.idempotency_key
  returning id into v_enquiry_id;
  return v_enquiry_id;
end;
$$;

create function public.request_listing_booking(
  p_listing_room_id uuid,
  p_move_in_date date,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.listing_rooms%rowtype;
  v_listing public.listings%rowtype;
  v_business_id uuid;
  v_booking_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() or not public.has_role('student') then
    raise exception 'Sign in with a verified, active student account to request a room.'
      using errcode = '42501';
  end if;
  if p_move_in_date is null or p_move_in_date < current_date or p_idempotency_key is null then
    raise exception 'Choose a valid future move-in date.' using errcode = '22023';
  end if;

  select id into v_booking_id from public.bookings
  where student_user_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if not exists (
      select 1 from public.bookings booking
      where booking.id = v_booking_id
        and booking.listing_room_id = p_listing_room_id
        and booking.move_in_date = p_move_in_date
    ) then
      raise exception 'This request key was already used for a different booking.' using errcode = '22023';
    end if;
    return v_booking_id;
  end if;

  select room.* into v_room from public.listing_rooms room
  where room.id = p_listing_room_id and room.is_active
  for share;
  if not found or v_room.availability_status = 'unavailable'
    or v_room.available_quantity is null or v_room.available_quantity <= 0 then
    raise exception 'This room offer is not accepting booking requests.' using errcode = '22023';
  end if;
  select listing.* into v_listing from public.listings listing
  where listing.id = v_room.listing_id and listing.status = 'published';
  if not found then
    raise exception 'The selected listing is not published.' using errcode = '22023';
  end if;
  select property.provider_business_id into v_business_id
  from public.properties property where property.id = v_listing.property_id;

  insert into public.bookings (
    listing_id, property_id, provider_business_id, listing_room_id,
    student_user_id, move_in_date, price_amount, currency, pricing_period, idempotency_key
  ) values (
    v_listing.id, v_listing.property_id, v_business_id, v_room.id,
    auth.uid(), p_move_in_date, v_room.price_amount, 'GHS',
    case v_room.pricing_period when 'month' then 'monthly' else v_room.pricing_period end,
    p_idempotency_key
  ) returning id into v_booking_id;

  insert into public.booking_events (booking_id, actor_user_id, new_status)
  values (v_booking_id, auth.uid(), 'requested');
  return v_booking_id;
end;
$$;

create or replace function public.provider_update_booking_status(p_booking_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_room_quantity integer;
  v_reserved_count bigint;
begin
  if not public.is_active_user() then
    raise exception 'An active verified account is required.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('accepted', 'rejected', 'completed') then
    raise exception 'Unsupported provider booking decision.' using errcode = '22023';
  end if;

  select * into v_booking from public.bookings
  where id = p_booking_id
  for update;
  if not found or not public.is_business_member(
    v_booking.provider_business_id, array['owner', 'manager']::text[]
  ) then
    raise exception 'Booking not found or not manageable by this provider.' using errcode = '42501';
  end if;
  if not ((v_booking.status = 'requested' and p_status in ('accepted', 'rejected'))
    or (v_booking.status = 'paid' and p_status = 'completed')) then
    raise exception 'This booking status transition is not allowed.' using errcode = '22023';
  end if;

  if p_status = 'accepted' then
    select available_quantity into v_room_quantity
    from public.listing_rooms
    where id = v_booking.listing_room_id
    for update;
    if not found or v_room_quantity is null then
      raise exception 'A confirmed room quantity is required before accepting this booking.'
        using errcode = '22023';
    end if;
    select count(*) into v_reserved_count
    from public.bookings
    where listing_room_id = v_booking.listing_room_id
      and status in ('accepted', 'paid');
    if v_reserved_count >= v_room_quantity then
      raise exception 'The room quantity has already been accepted for other students.'
        using errcode = '22023';
    end if;
  end if;

  update public.bookings set status = p_status where id = p_booking_id;
  insert into public.booking_events (booking_id, actor_user_id, previous_status, new_status)
  values (p_booking_id, auth.uid(), v_booking.status, p_status);
end;
$$;

create function public.configure_booking_payment_amount(
  p_payment_id uuid,
  p_student_user_id uuid,
  p_payment_percent integer
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_amount_pesewas bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    or p_payment_percent is null
    or p_payment_percent not between 1 and 100 then
    raise exception 'A valid server payment policy is required.' using errcode = '42501';
  end if;

  select * into v_payment from public.payments
  where id = p_payment_id
  for update;
  if not found or v_payment.status <> 'initializing'
    or v_payment.student_user_id <> p_student_user_id then
    raise exception 'Payment attempt is not configurable.' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings
  where id = v_payment.booking_id
    and student_user_id = p_student_user_id
    and status = 'accepted'
  for update;
  if not found or v_payment.currency <> 'GHS' then
    raise exception 'Accepted GHS booking not found for this payment.' using errcode = '22023';
  end if;

  v_amount_pesewas := round(v_booking.price_amount * 100 * p_payment_percent / 100.0)::bigint;
  if v_amount_pesewas <= 0
    or v_amount_pesewas > round(v_booking.price_amount * 100)::bigint then
    raise exception 'Configured payment amount is outside the booking price.' using errcode = '22023';
  end if;

  update public.payments set amount_pesewas = v_amount_pesewas
  where id = v_payment.id;
  return v_amount_pesewas;
end;
$$;

grant select on public.listing_facilities to anon, authenticated;
grant select (
  id, property_id, name, description, accommodation_category, status, published_at, created_at, updated_at,
  location_summary, nearby_institution, available_from, availability_status,
  included_utilities, house_rules, deposit_requirements, contact_preference,
  viewing_preference
) on public.listings to anon, authenticated;
grant select (address) on public.properties to authenticated;
grant select (provider_business_id) on public.properties to authenticated;
grant select (
  id, listing_id, label, description, price_amount, currency, pricing_period,
  occupancy, available_quantity, is_active, deposit_amount, features, availability_status
) on public.listing_rooms to anon, authenticated;
grant execute on function public.save_provider_property(jsonb, uuid) to authenticated;
grant execute on function public.save_provider_listing(uuid, jsonb, jsonb, text[], boolean)
  to authenticated;
grant execute on function public.submit_listing_enquiry(uuid, text, text, text, text, date, uuid)
  to authenticated;
grant execute on function public.request_listing_booking(uuid, date, uuid) to authenticated;
grant execute on function public.configure_booking_payment_amount(uuid, uuid, integer)
  to service_role;

revoke all on function public.save_provider_property(jsonb, uuid) from public, anon;
revoke all on function public.save_provider_listing(uuid, jsonb, jsonb, text[], boolean)
  from public, anon;
revoke all on function public.submit_listing_enquiry(uuid, text, text, text, text, date, uuid)
  from public, anon;
revoke all on function public.request_listing_booking(uuid, date, uuid) from public, anon;
revoke all on function public.configure_booking_payment_amount(uuid, uuid, integer)
  from public, anon, authenticated;

create policy "Listing media managers create metadata before publication"
  on public.listing_media for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and processing_status = 'pending'
    and storage_bucket = 'listing-media'
    and (select public.is_listing_business_member(
      listing_id, array['owner', 'manager', 'editor']::text[]
    ))
    and exists (
      select 1 from public.listings listing
      where listing.id = listing_media.listing_id
        and listing.status in ('draft', 'rejected')
        and listing.id::text = (storage.foldername(listing_media.storage_path))[1]
    )
  );
create policy "Listing media managers delete metadata before publication"
  on public.listing_media for delete to authenticated
  using (
    (select public.is_listing_business_member(
      listing_id, array['owner', 'manager']::text[]
    ))
    and exists (
      select 1 from public.listings listing
      where listing.id = listing_media.listing_id
        and listing.status in ('draft', 'rejected')
    )
  );
grant insert (listing_id, kind, storage_bucket, storage_path, sort_order, is_cover, alt_text,
  uploaded_by, processing_status) on public.listing_media to authenticated;
grant delete on public.listing_media to authenticated;
