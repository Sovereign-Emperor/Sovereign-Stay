-- Keep public discovery bounded.  The browser receives only one requested page
-- of listing ids and then loads the corresponding public-safe records.
create function public.search_public_listings(
  p_filters jsonb default '{}'::jsonb,
  p_sort_by text default 'recommended',
  p_page integer default 1,
  p_page_size integer default 12
)
returns table (listing_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with matching as (
    select l.id, min(r.price_amount) as starting_price, max(l.updated_at) as updated_at
    from public.listings l
    join public.properties p on p.id = l.property_id
    join public.locations loc on loc.id = p.location_id
    join public.listing_rooms r on r.listing_id = l.id and r.is_active
    left join public.room_types rt on rt.id = r.room_type_id
    where l.status = 'published'
      and (coalesce(p_filters->>'query', '') = '' or concat_ws(' ', l.name, l.location_summary, loc.label, loc.area, loc.city) ilike '%' || (p_filters->>'query') || '%')
      and (coalesce(p_filters->>'school', '') = '' or l.nearby_institution = p_filters->>'school' or exists (select 1 from public.listing_institutions li join public.institutions i on i.id = li.institution_id where li.listing_id = l.id and i.name = p_filters->>'school'))
      and (coalesce(p_filters->>'area', '') = '' or loc.area = p_filters->>'area')
      and (coalesce(p_filters->>'roomType', '') = '' or coalesce(r.label, rt.display_name) = p_filters->>'roomType')
      and (coalesce(p_filters->>'propertyType', '') = '' or l.accommodation_category = p_filters->>'propertyType' or p.property_type = p_filters->>'propertyType')
      and (coalesce(p_filters->>'availabilityStatus', '') = '' or r.availability_status = p_filters->>'availabilityStatus')
      and (coalesce(p_filters->>'minPrice', '') = '' or r.price_amount >= (p_filters->>'minPrice')::numeric)
      and (coalesce(p_filters->>'maxPrice', '') = '' or r.price_amount <= (p_filters->>'maxPrice')::numeric)
      and (coalesce(p_filters->>'facility', '') = '' or exists (select 1 from public.listing_facilities lf join public.facilities f on f.id = lf.facility_id where lf.listing_id = l.id and f.display_name = p_filters->>'facility'))
    group by l.id
  ), numbered as (
    select id, count(*) over() as total_count,
      row_number() over (order by
        case when p_sort_by = 'price-low' then starting_price end asc nulls last,
        case when p_sort_by = 'price-high' then starting_price end desc nulls last,
        case when p_sort_by not in ('price-low', 'price-high') then updated_at end desc,
        id
      ) as row_number
    from matching
  )
  select id, total_count from numbered
  where row_number > greatest(p_page - 1, 0) * least(greatest(p_page_size, 1), 50)
    and row_number <= greatest(p_page, 1) * least(greatest(p_page_size, 1), 50)
  order by row_number;
$$;

create function public.public_listing_filter_options()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'totalListings', (select count(*) from public.listings where status = 'published'),
    'schools', coalesce((select jsonb_agg(name order by name) from (select distinct coalesce(l.nearby_institution, i.name) as name from public.listings l left join public.listing_institutions li on li.listing_id = l.id left join public.institutions i on i.id = li.institution_id where l.status = 'published' and coalesce(l.nearby_institution, i.name) is not null) x), '[]'::jsonb),
    'areas', coalesce((select jsonb_agg(area order by area) from (select distinct loc.area from public.listings l join public.properties p on p.id = l.property_id join public.locations loc on loc.id = p.location_id where l.status = 'published' and loc.area is not null) x), '[]'::jsonb),
    'roomTypes', coalesce((select jsonb_agg(name order by name) from (select distinct coalesce(r.label, rt.display_name) as name from public.listings l join public.listing_rooms r on r.listing_id = l.id and r.is_active left join public.room_types rt on rt.id = r.room_type_id where l.status = 'published' and coalesce(r.label, rt.display_name) is not null) x), '[]'::jsonb),
    'propertyTypes', coalesce((select jsonb_agg(name order by name) from (select distinct coalesce(l.accommodation_category, p.property_type) as name from public.listings l join public.properties p on p.id = l.property_id where l.status = 'published' and coalesce(l.accommodation_category, p.property_type) is not null) x), '[]'::jsonb),
    'availabilityStatuses', coalesce((select jsonb_agg(status order by status) from (select distinct r.availability_status as status from public.listings l join public.listing_rooms r on r.listing_id = l.id and r.is_active where l.status = 'published' and r.availability_status is not null) x), '[]'::jsonb),
    'facilities', coalesce((select jsonb_agg(name order by name) from (select distinct f.display_name as name from public.listings l join public.listing_facilities lf on lf.listing_id = l.id join public.facilities f on f.id = lf.facility_id where l.status = 'published') x), '[]'::jsonb)
  );
$$;

revoke all on function public.search_public_listings(jsonb, text, integer, integer) from public;
revoke all on function public.public_listing_filter_options() from public;
grant execute on function public.search_public_listings(jsonb, text, integer, integer) to anon, authenticated;
grant execute on function public.public_listing_filter_options() to anon, authenticated;
