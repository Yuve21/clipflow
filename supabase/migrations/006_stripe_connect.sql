-- Stripe Connect fields on workspaces
alter table workspaces
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarded boolean not null default false;

-- Payment fields on invoices
alter table invoices
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_link text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists platform_fee_cents integer,
  add column if not exists paid_via_stripe boolean not null default false;
