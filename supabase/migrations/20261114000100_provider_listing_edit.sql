create function public.request_provider_listing_edit(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'An active authenticated provider account is required.'
      using errcode = '42501';
  end if;

  select listing.status into v_previous_status
  from public.listings as listing
  where listing.id = p_listing_id
    and public.is_listing_business_member(
      listing.id, array['owner', 'manager']::text[]
    )
  for update;

  if not found or v_previous_status <> 'published' then
    raise exception 'Only a published listing managed by a business owner or manager can be returned for editing.'
      using errcode = '42501';
  end if;

  update public.listings
  set status = 'draft', published_at = null
  where id = p_listing_id;

  insert into public.platform_audit_events (
    actor_user_id, action, resource_type, resource_id, details
  ) values (
    auth.uid(),
    'provider_listing_edit_requested',
    'listing',
    p_listing_id,
    jsonb_build_object('previous_status', v_previous_status, 'new_status', 'draft')
  );
end;
$$;

revoke all on function public.request_provider_listing_edit(uuid) from public, anon;
grant execute on function public.request_provider_listing_edit(uuid) to authenticated;
