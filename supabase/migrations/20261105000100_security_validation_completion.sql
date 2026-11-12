-- Retired room offers may remain available to their managing business for
-- historical editing, but they must not appear in public listing queries.
drop policy if exists "Anonymous users read room offers for published listings"
  on public.listing_rooms;
create policy "Anonymous users read active room offers for published listings"
  on public.listing_rooms for select to anon
  using (
    is_active
    and (select public.is_listing_public(listing_id))
  );

drop policy if exists "Authenticated users read public or managed room offers"
  on public.listing_rooms;
create policy "Authenticated users read active public or managed room offers"
  on public.listing_rooms for select to authenticated
  using (
    (select public.has_role('admin'))
    or (
      is_active
      and (select public.is_listing_public(listing_id))
    )
    or (select public.is_listing_business_member(listing_id, null))
  );
