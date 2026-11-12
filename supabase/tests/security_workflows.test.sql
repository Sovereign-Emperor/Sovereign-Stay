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
    select count(*) = 8
    from pg_class as relation
    where relation.oid = any (array[
      'public.profiles'::regclass,
      'public.properties'::regclass,
      'public.listings'::regclass,
      'public.listing_rooms'::regclass,
      'public.enquiries'::regclass,
      'public.bookings'::regclass,
      'public.payments'::regclass,
      'public.listing_reports'::regclass
    ])
      and relation.relrowsecurity
  ),
  'RLS remains enabled for exposed identity, listing, operation, and payment tables'
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

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'security-provider@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'security-student@example.test', '', now(),
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
  'auth-user trigger provisions a student profile and role'
);

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

update public.listings
set status = 'published', published_at = now()
where id = current_setting('test.listing_id')::uuid;

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
reset role;

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

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true
);
set local role authenticated;
select public.provider_update_booking_status(
  current_setting('test.booking_id')::uuid, 'accepted'
);
reset role;

select set_config(
  'request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true
);
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

select * from finish();
rollback;
