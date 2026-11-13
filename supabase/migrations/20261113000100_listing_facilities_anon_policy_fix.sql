drop policy if exists "Public and authorized users read listing facilities"
  on public.listing_facilities;

create policy "Anonymous users read facilities of published listings"
  on public.listing_facilities for select to anon
  using ((select public.is_listing_public(listing_id)));

create policy "Authenticated users read public or managed listing facilities"
  on public.listing_facilities for select to authenticated
  using (
    (select public.is_listing_public(listing_id))
    or (select public.is_listing_business_member(listing_id, null))
    or (select public.has_role('admin'))
  );
