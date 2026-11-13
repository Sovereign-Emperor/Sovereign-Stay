begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select * from no_plan();

select ok(
  exists (select 1 from public.roles where role_key = 'student'),
  'student role is provisioned by migrations'
);
select ok(
  exists (select 1 from public.room_types where type_key = 'single')
  and exists (select 1 from public.facilities where facility_key = 'wifi'),
  'listing room and facility catalogues are provisioned by migrations'
);
select ok(
  not has_column_privilege('authenticated', 'public.properties', 'address', 'SELECT'),
  'authenticated clients cannot directly select exact property addresses'
);
select ok(
  not has_column_privilege('anon', 'public.properties', 'address', 'SELECT'),
  'anonymous clients cannot directly select exact property addresses'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.get_authorized_property_addresses(uuid[])', 'EXECUTE'
  ),
  'authenticated clients use the authorized address function'
);
select ok(
  not has_function_privilege(
    'anon', 'public.get_authorized_property_addresses(uuid[])', 'EXECUTE'
  ),
  'anonymous clients cannot call the exact-address function'
);
select ok(
  exists (
    select 1 from pg_proc as function
    where function.oid = 'public.get_authorized_property_addresses(uuid[])'::regprocedure
      and function.prosecdef
      and 'search_path=""' = any (function.proconfig)
  ),
  'exact-address function is SECURITY DEFINER with a fixed empty search path'
);
select ok(
  not has_table_privilege('authenticated', 'public.payments', 'INSERT')
  and not has_table_privilege('authenticated', 'public.payments', 'UPDATE'),
  'authenticated clients cannot write payment records directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.user_roles', 'DELETE'),
  'authenticated clients cannot grant or remove roles directly'
);
select ok(
  not has_any_column_privilege('authenticated', 'public.listing_rooms', 'INSERT')
  and not has_any_column_privilege('authenticated', 'public.listing_rooms', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.listing_rooms', 'DELETE'),
  'providers must edit room offers through the transactional RPC'
);
select ok(
  not has_function_privilege(
    'authenticated', 'public.apply_verified_paystack_payment(text,bigint,text,text)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.apply_verified_paystack_payment(text,bigint,text,text)', 'EXECUTE'
  ),
  'only service_role can apply verified Paystack payments'
);
select ok(
  not has_function_privilege(
    'authenticated', 'public.mark_verified_paystack_payment_failed(text,bigint,text,text,text)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.mark_verified_paystack_payment_failed(text,bigint,text,text,text)', 'EXECUTE'
  ),
  'only service_role can record verified Paystack failures'
);
select ok(
  not has_function_privilege(
    'service_role', 'public.mark_paystack_payment_failed(text,text,text)', 'EXECUTE'
  ),
  'the weaker payment-failure RPC is no longer executable'
);
select ok(
  not has_function_privilege(
    'authenticated', 'public.record_platform_audit_event(text,text,uuid,jsonb)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.record_platform_audit_event(text,text,uuid,jsonb)', 'EXECUTE'
  ),
  'generic platform audit recording is server-only'
);
select ok(
  exists (
    select 1 from pg_index as index
    where index.indexrelid = 'public.payments_gateway_transaction_id_unique_idx'::regclass
      and index.indisunique
  ),
  'gateway transaction IDs cannot be applied to multiple payments'
);
select ok(
  exists (
    select 1 from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.bookings'::regclass
      and constraint_row.confrelid = 'public.listing_rooms'::regclass
      and constraint_row.confdeltype = 'r'
  ),
  'booking-to-room foreign key continues to restrict deletion'
);
select ok(
  position(
    'set is_active = false' in
      lower(pg_get_functiondef('public.save_provider_listing(uuid,jsonb,jsonb,text[],boolean)'::regprocedure))
  ) > 0
  and position(
    'delete from public.listing_rooms' in
      lower(pg_get_functiondef('public.save_provider_listing(uuid,jsonb,jsonb,text[],boolean)'::regprocedure))
  ) = 0,
  'listing saves retire omitted rooms without deleting booking references'
);
select ok(
  (
    select count(*) = 27
    from pg_class as relation
    where relation.oid = any (array[
      'public.profiles'::regclass,
      'public.roles'::regclass,
      'public.user_roles'::regclass,
      'public.provider_businesses'::regclass,
      'public.provider_business_memberships'::regclass,
      'public.locations'::regclass,
      'public.institutions'::regclass,
      'public.properties'::regclass,
      'public.listings'::regclass,
      'public.listing_institutions'::regclass,
      'public.room_types'::regclass,
      'public.listing_rooms'::regclass,
      'public.facilities'::regclass,
      'public.property_facilities'::regclass,
      'public.listing_media'::regclass,
      'public.availability'::regclass,
      'public.moderation_actions'::regclass,
      'public.verification_events'::regclass,
      'public.enquiries'::regclass,
      'public.bookings'::regclass,
      'public.booking_events'::regclass,
      'public.payments'::regclass,
      'public.reviews'::regclass,
      'public.listing_reports'::regclass,
      'public.notifications'::regclass,
      'public.platform_audit_events'::regclass,
      'public.listing_facilities'::regclass
    ])
      and relation.relrowsecurity
  ),
  'RLS remains enabled for every public application table'
);
select ok(
  not exists (
    select 1
    from pg_proc as function
    join pg_namespace as schema on schema.oid = function.pronamespace
    where schema.nspname = 'public'
      and function.prosecdef
      and not (
        'search_path=""' = any(coalesce(function.proconfig, array[]::text[]))
      )
  ),
  'every public SECURITY DEFINER function fixes its search path'
);
select ok(
  not has_function_privilege(
    'anon', 'public.is_listing_business_member(uuid,text[])', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.has_role(text)', 'EXECUTE'
  )
  and has_function_privilege(
    'anon', 'public.is_listing_public(uuid)', 'EXECUTE'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_facilities'
      and policyname = 'Anonymous users read facilities of published listings'
      and position('is_listing_public' in qual) > 0
      and position('is_listing_business_member' in qual) = 0
      and position('has_role' in qual) = 0
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_facilities'
      and policyname = 'Authenticated users read public or managed listing facilities'
      and position('is_listing_business_member' in qual) > 0
      and position('has_role' in qual) > 0
  ),
  'anonymous facility reads avoid authenticated-only helper functions'
);
select ok(
  not exists (
    select 1
    from pg_proc as function
    join pg_namespace as schema on schema.oid = function.pronamespace
    where schema.nspname = 'public'
      and function.prosecdef
      and has_function_privilege('anon', function.oid, 'EXECUTE')
      and function.oid not in (
        'public.is_property_public(uuid)'::regprocedure,
        'public.is_listing_public(uuid)'::regprocedure
      )
  ),
  'anonymous users cannot execute privileged security-definer functions'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_rooms'
      and policyname = 'Anonymous users read active room offers for published listings'
      and position('is_active' in qual) > 0
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_rooms'
      and policyname = 'Authenticated users read active public or managed room offers'
      and position('is_active' in qual) > 0
      and position('is_listing_business_member' in qual) > 0
  ),
  'public clients cannot read retired room offers, while managing providers can'
);
select ok(
  exists (
    select 1 from storage.buckets
    where id = 'listing-media'
      and not public
      and file_size_limit = 5242880
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  'listing media remains private and limited to supported image types and size'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass)
  and exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Business members upload to unpublished listings'
      and position('is_listing_business_member' in with_check) > 0
      and position('editor' in with_check) > 0
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Business members delete unpublished listing images'
      and position('owner' in qual) > 0
      and position('manager' in qual) > 0
      and position('editor' in qual) = 0
  ),
  'storage object operations require the expected listing membership roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.listing_media', 'UPDATE'),
  'clients cannot mark uploaded media as processed or ready'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'enquiries'
      and policyname = 'Students submit enquiries to published listings'
      and position('has_role' in with_check) > 0
      and position('student' in with_check) > 0
  ),
  'direct enquiry inserts require the student role'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Students request rooms on published listings'
      and position('has_role' in with_check) > 0
      and position('student' in with_check) > 0
  ),
  'direct booking inserts require the student role'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_reports'
      and policyname = 'Active students report published listings'
      and position('has_role' in with_check) > 0
      and position('student' in with_check) > 0
  ),
  'direct report inserts require the student role'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Active students review completed bookings once'
      and position('is_active_user' in with_check) > 0
      and position('has_role' in with_check) > 0
      and position('student' in with_check) > 0
  ),
  'review inserts require an active student role'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'security-provider@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"account_type":"admin"}'::jsonb, now(), now()
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'security-student@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"account_type":"provider"}'::jsonb, now(), now()
  ),
  (
    '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'security-admin@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );
select ok(
  exists (
    select 1 from public.profiles as profile
    join public.user_roles as user_role on user_role.user_id = profile.id
    join public.roles as role on role.id = user_role.role_id
    where profile.id = '10000000-0000-4000-8000-000000000002'
      and role.role_key = 'student'
  ),
  'auth-user trigger provisions a student role regardless of signup metadata'
);
select ok(
  not exists (
    select 1 from public.user_roles as user_role
    join public.roles as role on role.id = user_role.role_id
    where user_role.user_id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
      and role.role_key in ('provider', 'admin')
  ),
  'signup metadata cannot provision provider or administrator roles'
);
insert into public.user_roles (user_id, role_id)
select '10000000-0000-4000-8000-000000000003', id
from public.roles where role_key = 'admin';

delete from public.user_roles
where user_id = '10000000-0000-4000-8000-000000000001'
  and role_id = (select id from public.roles where role_key = 'student');

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select set_config(
  'test.business_id',
  public.create_provider_business('Security test provider')::text,
  true
);
select set_config(
  'test.property_id',
  public.save_provider_property(
    jsonb_build_object(
      'name', 'Security test property',
      'type', 'Hostel',
      'description', 'Temporary database test fixture.',
      'area', 'Adweso',
      'city', 'Koforidua',
      'region', 'Eastern',
      'address', '12 Private Test Road'
    ),
    null
  )::text,
  true
);
select set_config(
  'test.listing_id',
  public.save_provider_listing(
    null,
    jsonb_build_object(
      'propertyId', current_setting('test.property_id')::uuid,
      'name', 'Security test listing',
      'description', 'Temporary database test fixture.',
      'accommodationCategory', 'Hostel',
      'locationSummary', 'Adweso',
      'houseRules', '[]'::jsonb
    ),
    jsonb_build_array(jsonb_build_object(
      'roomType', 'single',
      'description', 'Temporary test room.',
      'occupancy', 1,
      'quantity', 2,
      'price', 1000,
      'period', 'monthly',
      'availabilityStatus', 'unknown'
    )),
    '{}'::text[],
    false
  )::text,
  true
);
reset role;

select ok(
  exists (
    select 1 from public.user_roles as user_role
    join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = '10000000-0000-4000-8000-000000000001'
      and role.role_key = 'provider'
  )
  and exists (
    select 1 from public.provider_business_memberships as membership
    where membership.user_id = '10000000-0000-4000-8000-000000000001'
      and membership.provider_business_id = current_setting('test.business_id')::uuid
      and membership.membership_role = 'owner'
  ),
  'provider onboarding grants provider role only through its authorized workflow'
);

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
set local role authenticated;
select public.submit_listing_for_review(current_setting('test.listing_id')::uuid);
reset role;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true
);
set local role authenticated;
select public.admin_review_listing(
  current_setting('test.listing_id')::uuid, 'publish', null
);
reset role;
select ok(
  (select status = 'published' from public.listings
   where id = current_setting('test.listing_id')::uuid)
  and exists (
    select 1 from public.moderation_actions
    where listing_id = current_setting('test.listing_id')::uuid
      and actor_user_id = '10000000-0000-4000-8000-000000000003'
      and new_status = 'published'
  ),
  'administrator moderation publishes a submitted listing with trusted actor attribution'
);

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
set local role authenticated;
select set_config(
  'test.provider_addresses',
  (select count(*)::text
   from public.get_authorized_property_addresses(
     array[current_setting('test.property_id')::uuid]
   )),
  true
);
reset role;
select is(
  current_setting('test.provider_addresses')::integer,
  1,
  'an active managing provider can access its exact property address'
);

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true
);
set local role authenticated;
select set_config(
  'test.admin_addresses',
  (select count(*)::text
   from public.get_authorized_property_addresses(
     array[current_setting('test.property_id')::uuid]
   )),
  true
);
reset role;
select is(
  current_setting('test.admin_addresses')::integer,
  1,
  'an active administrator can access an exact property address'
);

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
set local role authenticated;
select throws_ok(
  format(
    'insert into public.enquiries (listing_id, property_id, provider_business_id, student_user_id, student_name, student_email, student_phone, message, idempotency_key) values (%L::uuid, %L::uuid, %L::uuid, %L::uuid, %L, %L, %L, %L, %L::uuid)',
    current_setting('test.listing_id'),
    current_setting('test.property_id'),
    current_setting('test.business_id'),
    '10000000-0000-4000-8000-000000000001',
    'Provider',
    'provider@example.test',
    '0200000000',
    'Not a student enquiry.',
    '30000000-0000-4000-8000-000000000001'
  ),
  '42501',
  null,
  'provider without a student role cannot directly create an enquiry'
);
select throws_ok(
  format(
    'insert into public.bookings (listing_id, property_id, provider_business_id, listing_room_id, student_user_id, move_in_date, price_amount, currency, pricing_period, idempotency_key) values (%L::uuid, %L::uuid, %L::uuid, (select id from public.listing_rooms where listing_id = %L::uuid and is_active), %L::uuid, current_date + 1, 1000, %L, %L, %L::uuid)',
    current_setting('test.listing_id'),
    current_setting('test.property_id'),
    current_setting('test.business_id'),
    current_setting('test.listing_id'),
    '10000000-0000-4000-8000-000000000001',
    'GHS',
    'month',
    '30000000-0000-4000-8000-000000000002'
  ),
  '42501',
  null,
  'provider without a student role cannot directly create a booking'
);
select throws_ok(
  format(
    'insert into public.listing_reports (listing_id, reporter_user_id, reason, message) values (%L::uuid, %L::uuid, %L, %L)',
    current_setting('test.listing_id'),
    '10000000-0000-4000-8000-000000000001',
    'other',
    'Not a student report.'
  ),
  '42501',
  null,
  'provider without a student role cannot directly create a listing report'
);
select throws_ok(
  format(
    'select public.admin_review_listing(%L::uuid, %L, %L)',
    current_setting('test.listing_id'),
    'rejected',
    'A provider cannot moderate their own listing.'
  ),
  '42501',
  null,
  'provider accounts cannot execute administrator moderation'
);
reset role;

update public.profiles
set account_status = 'suspended'
where id = '10000000-0000-4000-8000-000000000002';
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
set local role authenticated;
select throws_ok(
  format(
    'insert into public.enquiries (listing_id, property_id, provider_business_id, student_user_id, student_name, student_email, student_phone, message, idempotency_key) values (%L::uuid, %L::uuid, %L::uuid, %L::uuid, %L, %L, %L, %L, %L::uuid)',
    current_setting('test.listing_id'),
    current_setting('test.property_id'),
    current_setting('test.business_id'),
    '10000000-0000-4000-8000-000000000002',
    'Suspended student',
    'student@example.test',
    '0200000000',
    'This should be rejected.',
    '30000000-0000-4000-8000-000000000003'
  ),
  '42501',
  null,
  'suspended student accounts cannot directly create enquiries'
);
reset role;
update public.profiles
set account_status = 'active'
where id = '10000000-0000-4000-8000-000000000002';

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
set local role authenticated;
select set_config(
  'test.pending_addresses',
  (select count(*)::text
   from public.get_authorized_property_addresses(
     array[current_setting('test.property_id')::uuid]
   )),
  true
);
select set_config(
  'test.booking_id',
  public.request_listing_booking(
    (select id from public.listing_rooms
     where listing_id = current_setting('test.listing_id')::uuid and is_active),
    current_date + 1,
    '20000000-0000-4000-8000-000000000001'
  )::text,
  true
);
select is(
  current_setting('test.pending_addresses')::integer,
  0,
  'a student with only a pending booking cannot read the exact address'
);
reset role;

update public.listings
set status = 'draft', published_at = null
where id = current_setting('test.listing_id')::uuid;
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
set local role authenticated;
select public.save_provider_listing(
  current_setting('test.listing_id')::uuid,
  jsonb_build_object(
    'propertyId', current_setting('test.property_id')::uuid,
    'name', 'Security test listing',
    'description', 'Temporary database test fixture.',
    'accommodationCategory', 'Hostel',
    'locationSummary', 'Adweso',
    'houseRules', '[]'::jsonb
  ),
  '[]'::jsonb,
  '{}'::text[],
  false
);
reset role;

select ok(
  exists (
    select 1 from public.listing_rooms as room
    join public.bookings as booking on booking.listing_room_id = room.id
    where room.listing_id = current_setting('test.listing_id')::uuid
      and not room.is_active
      and booking.id = current_setting('test.booking_id')::uuid
  ),
  'removing a booked room retires it and preserves the booking foreign key'
);

update public.listings
set status = 'published', published_at = now()
where id = current_setting('test.listing_id')::uuid;
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
select set_config(
  'test.anonymous_room_count',
  (select count(*)::text
   from public.listing_rooms
   where listing_id = current_setting('test.listing_id')::uuid),
  true
);
reset role;
select is(
  current_setting('test.anonymous_room_count')::integer,
  0,
  'anonymous clients cannot read retired offers on a published listing'
);
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select set_config(
  'test.provider_inactive_room_count',
  (select count(*)::text
   from public.listing_rooms
   where listing_id = current_setting('test.listing_id')::uuid
     and not is_active),
  true
);
reset role;
select is(
  current_setting('test.provider_inactive_room_count')::integer,
  1,
  'managing providers retain access to retired room history'
);

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select public.provider_update_booking_status(
  current_setting('test.booking_id')::uuid, 'accepted'
);
reset role;

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select set_config(
  'test.accepted_addresses',
  (select count(*)::text
   from public.get_authorized_property_addresses(
     array[current_setting('test.property_id')::uuid]
   )),
  true
);
select set_config(
  'test.payment',
  public.begin_booking_payment(
    current_setting('test.booking_id')::uuid,
    '20000000-0000-4000-8000-000000000002'
  )::text,
  true
);
select is(
  current_setting('test.accepted_addresses')::integer,
  1,
  'a student can read the exact address after provider acceptance'
);
reset role;

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select throws_ok(
  format(
    'update public.payments set status = %L where provider_reference = %L',
    'succeeded',
    current_setting('test.payment')::jsonb ->> 'reference'
  ),
  '42501',
  null,
  'authenticated students cannot change payment status directly'
);
reset role;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select throws_ok(
  format(
    'select public.apply_verified_paystack_payment(%L, %s, %L, %L)',
    current_setting('test.payment')::jsonb ->> 'reference',
    (current_setting('test.payment')::jsonb ->> 'amount_pesewas')::bigint + 1,
    'GHS',
    '987654321'
  ),
  '22023',
  null,
  'server-side payment finalization rejects a mismatched amount'
);
select set_config(
  'test.first_payment_result',
  public.apply_verified_paystack_payment(
    current_setting('test.payment')::jsonb ->> 'reference',
    (current_setting('test.payment')::jsonb ->> 'amount_pesewas')::bigint,
    'GHS',
    '987654321'
  )::text,
  true
);
select set_config(
  'test.duplicate_payment_result',
  public.apply_verified_paystack_payment(
    current_setting('test.payment')::jsonb ->> 'reference',
    (current_setting('test.payment')::jsonb ->> 'amount_pesewas')::bigint,
    'GHS',
    '987654321'
  )::text,
  true
);
select is(
  current_setting('test.first_payment_result'),
  current_setting('test.duplicate_payment_result'),
  'duplicate verified payment delivery returns the same booking'
);
select throws_ok(
  format(
    'select public.apply_verified_paystack_payment(%L, %s, %L, %L)',
    current_setting('test.payment')::jsonb ->> 'reference',
    (current_setting('test.payment')::jsonb ->> 'amount_pesewas')::bigint,
    'GHS',
    '987654322'
  ),
  '22023',
  null,
  'duplicate payment with a different gateway transaction is rejected'
);
reset role;

select ok(
  (select status = 'succeeded' from public.payments
   where provider_reference = current_setting('test.payment')::jsonb ->> 'reference')
  and (select count(*) = 1 from public.booking_events
       where booking_id = current_setting('test.booking_id')::uuid
         and new_status = 'paid'),
  'duplicate delivery does not repeat the successful payment transition'
);
select ok(
  position(
    'if v_payment.status = ''failed''' in lower(pg_get_functiondef(
      'public.mark_verified_paystack_payment_failed(text,bigint,text,text,text)'::regprocedure
    ))
  ) > 0
  and position(
    'gateway_transaction_id is distinct from' in lower(pg_get_functiondef(
      'public.mark_verified_paystack_payment_failed(text,bigint,text,text,text)'::regprocedure
    ))
  ) > 0,
  'duplicate verified failure delivery is idempotent for the same transaction'
);

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
set local role authenticated;
select public.provider_update_booking_status(
  current_setting('test.booking_id')::uuid, 'completed'
);
reset role;

update public.profiles
set account_status = 'suspended'
where id = '10000000-0000-4000-8000-000000000002';
select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
set local role authenticated;
select throws_ok(
  format(
    'insert into public.reviews (booking_id, listing_id, student_user_id, rating, body) values (%L::uuid, %L::uuid, %L::uuid, %s, %L)',
    current_setting('test.booking_id'),
    current_setting('test.listing_id'),
    '10000000-0000-4000-8000-000000000002',
    5,
    'A review from a suspended account must be rejected.'
  ),
  '42501',
  null,
  'suspended students cannot submit reviews for completed bookings'
);
reset role;
update public.profiles
set account_status = 'active'
where id = '10000000-0000-4000-8000-000000000002';

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
set local role authenticated;
insert into public.reviews (
  booking_id, listing_id, student_user_id, rating, body
) values (
  current_setting('test.booking_id')::uuid,
  current_setting('test.listing_id')::uuid,
  '10000000-0000-4000-8000-000000000002',
  5,
  'An active student can submit a review after completion.'
);
reset role;
select ok(
  exists (
    select 1 from public.reviews
    where booking_id = current_setting('test.booking_id')::uuid
      and student_user_id = '10000000-0000-4000-8000-000000000002'
      and status = 'pending'
  ),
  'active students retain the ability to submit reviews for completed bookings'
);

select * from finish();
rollback;
