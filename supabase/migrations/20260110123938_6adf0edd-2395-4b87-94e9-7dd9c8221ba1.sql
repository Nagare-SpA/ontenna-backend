-- Allow users to insert their own subscription (for mock mode)
CREATE POLICY "Users can create their own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscription (for mock mode)
CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own subscription (for dev controls)
CREATE POLICY "Users can delete their own subscription" ON public.subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Allow users to create their own billing events
CREATE POLICY "Users can create their own billing events" ON public.billing_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);