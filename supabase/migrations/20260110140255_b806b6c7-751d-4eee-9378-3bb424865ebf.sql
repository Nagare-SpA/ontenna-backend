INSERT INTO public.user_roles (user_id, role)
VALUES ('9f068cb1-1e48-432b-81d1-91278988537e', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;