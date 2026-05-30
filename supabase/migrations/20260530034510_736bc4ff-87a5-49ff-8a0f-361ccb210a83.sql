
revoke execute on function public.is_company_member(uuid, uuid) from public, anon;
revoke execute on function public.has_company_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
