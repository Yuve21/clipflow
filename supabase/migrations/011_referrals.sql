-- Clipper → clipper referrals. Each workspace has a persistent referral_code;
-- each successful signup via that code is a referrals row that rewards the referrer.

alter table workspaces add column if not exists referral_code text unique;

-- Repurpose referrals: each row = one conversion. A referrer's code is reused
-- across many referrals, so drop the per-code unique; a workspace can only be
-- referred once.
alter table referrals drop constraint if exists referrals_code_key;
alter table referrals add column if not exists reward_credits integer not null default 0;

do $$
begin
  alter table referrals add constraint referrals_referred_unique unique (referred_workspace_id);
exception when duplicate_object then null;
end $$;
