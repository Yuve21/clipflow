-- Gap-analysis security fix: only the campaign-owning brand may change a
-- participation's status. The previous policy also let the clipper update their
-- own row, which allowed self-approval. Inserts (a clipper applying) are
-- unaffected — that's a separate INSERT policy.
drop policy if exists "clipper or brand updates participation" on campaign_participations;

create policy "brand updates participation" on campaign_participations
  for update to authenticated
  using (owns_campaign(campaign_id))
  with check (owns_campaign(campaign_id));
