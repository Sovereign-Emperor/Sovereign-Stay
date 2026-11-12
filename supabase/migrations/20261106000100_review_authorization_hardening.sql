drop policy if exists "Students review completed bookings once" on public.reviews;
create policy "Active students review completed bookings once"
  on public.reviews for insert to authenticated
  with check (
    student_user_id = (select auth.uid())
    and status = 'pending'
    and (select public.is_active_user())
    and (select public.has_role('student'))
    and exists (
      select 1 from public.bookings as booking
      where booking.id = reviews.booking_id
        and booking.listing_id = reviews.listing_id
        and booking.student_user_id = (select auth.uid())
        and booking.status = 'completed'
    )
  );
