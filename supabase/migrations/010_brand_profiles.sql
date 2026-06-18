-- Brand profiles for the marketplace: richer, browsable advertiser profiles so
-- clippers can discover brands and choose who they want to clip for.

alter table brands add column if not exists tagline text;
alter table brands add column if not exists is_listed boolean not null default true;

-- A brand's content niches (drives the brand directory filter + clipper matching)
create table if not exists brand_categories (
  brand_id uuid not null references brands(id) on delete cascade,
  category_slug text not null references content_categories(slug) on delete cascade,
  primary key (brand_id, category_slug)
);

alter table brand_categories enable row level security;

create policy "read brand categories" on brand_categories
  for select to authenticated using (true);
create policy "write own brand categories" on brand_categories
  for all to authenticated using (owns_brand(brand_id)) with check (owns_brand(brand_id));
