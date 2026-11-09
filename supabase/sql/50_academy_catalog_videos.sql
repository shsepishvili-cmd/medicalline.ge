-- =============================================================================
-- 50_academy_catalog_videos.sql
-- 1. Public read access to active products, so the public Academy can show
--    product cards and /academy/[product-slug] pages (the join from
--    academy_videos to products returned null for anonymous visitors).
-- 2. Catalog products that are missing from public.products are added.
-- 3. Academy videos for catalog products that had none.
-- Safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Public read policy (products hold only public catalog data; prices are
--    stored separately in public.prices and stay protected)
-- ---------------------------------------------------------------------------
drop policy if exists "public_read_active_products" on public.products;
create policy "public_read_active_products"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- ---------------------------------------------------------------------------
-- 2. Missing catalog products
-- ---------------------------------------------------------------------------
insert into public.products (slug, name, category_slug, brand)
select v.slug, v.name, c.slug, v.brand
from (values
  ('sidelab-p1',                          'SideLab P1 სავარძელთან 3D პრინტერი',              'scan',    'Eighteeth'),
  ('aurora-endofiles',                    'Aurora ენდოფაილები',                              'endo',    'Eighteeth'),
  ('e-style-gold-blue',                   'E-STYLE GOLD & BLUE ენდოფაილი',                   'endo',    'Eighteeth'),
  ('e-flex-mini',                         'E-FLEX MINI ენდოფაილი',                           'endo',    'Eighteeth'),
  ('e-flex-rt',                           'E-FLEX RT ენდოფაილი',                             'endo',    'Eighteeth'),
  ('e-flex-path',                         'E-FLEX PATH ენდოფაილი',                           'endo',    'Eighteeth'),
  ('helios-600',                          'Helios 600',                                      'scan',    'Eighteeth'),
  ('helios-500',                          'Helios 500 პირის ღრუს სკანერი',                   'scan',    'Eighteeth'),
  ('nanopix-1-2',                         'NanoPix 1 / 2 ვიზიოგრაფი',                        'radio',   'Eighteeth'),
  ('brilliance-bp',                       'Brilliance BP დენტალური ლუპა',                    'optics',  'Eighteeth'),
  ('wireless-z-plus',                     'Wireless Z+ უკაბელო განათება',                    'optics',  'Eighteeth'),
  ('soga-smart-2',                        'SOGA-SMART II ელექტრონული ანესთეზიის შპრიცი',     'other',   'SOGA'),
  ('soga-smart-1',                        'SOGA-Smart I ინტრალიგამენტური ანესთეზიის სისტემა', 'other',   'SOGA'),
  ('dental-laser',                        'დენტალური ლაზერი I LASER I PLUS-3',               'partner', 'SOGA'),
  ('ilaser-i-pro',                        'ILaser I Pro მრავალტალღიანი დიოდური ლაზერი',      'partner', 'SOGA'),
  ('piezo-surgery',                       'დენტალური პიეზო ქირურგიული აპარატი SOGA-B1',      'partner', 'SOGA'),
  ('mona-5l-pro',                         'Mona 5L Pro ავტოკლავი',                           'other',   'Mona'),
  ('wisedent-br-164ap',                   'Wisedent BR-164AP LED მაღალსიჩქარიანი ბუნიკი',    'partner', 'Wisedent'),
  ('wisedent-br-412k-implant',            'Wisedent BR-412K 20:1 implant contra angle',      'partner', 'Wisedent'),
  ('wisedent-br-412k-ed-implant',         'Wisedent BR-412K-ED 20:1 LED Implant Contra Angle', 'partner', 'Wisedent'),
  ('wisedent-br-422ss-15',                'Wisedent BR-422SS-15 1:5 contra angle',           'partner', 'Wisedent'),
  ('wisedent-low-speed-contra-angle',     'Wisedent Low Speed Contra Angle',                 'partner', 'Wisedent'),
  ('wisedent-low-speed-air-motor',        'Wisedent Low Speed Air Motor',                    'partner', 'Wisedent'),
  ('wisedent-low-speed-straight-handpiece', 'Wisedent Low Speed Straight Handpiece',         'partner', 'Wisedent')
) as v(slug, name, category, brand)
left join public.categories c on c.slug = v.category
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Videos (skips any product/video pair that already exists)
-- ---------------------------------------------------------------------------
insert into public.academy_videos
  (product_id, title, description, video_type, youtube_video_id, youtube_url,
   channel_title, language_code, is_active, added_manually)
select p.id, v.title, v.description, v.video_type, v.yt,
       'https://www.youtube.com/watch?v=' || v.yt, v.channel, v.lang, true, true
from (values
  ('sidelab-p1', '7lDaR7s6Tsc', 'SideLab P1 — PPS ტექნოლოგია და CeramicPod კაფსულა', 'როგორ აწვდის PPS ტექნოლოგია ფისს ბეჭდვის ზონას კონტროლირებადი პნევმატური წნევით.', 'demo', 'Eighteeth Sifary', 'en'),
  ('sidelab-p1', 'DYDC7FZVBIs', 'AI Crown — გვირგვინის დიზაინი ეტაპობრივად', 'გვირგვინის AI დიზაინი სავარძელთან სამუშაო პროცესისთვის, ბეჭდვამდე.', 'training', 'Eighteeth Sifary', 'en'),
  ('sidelab-p1', '6NnKzFbASGs', 'SideLab P1 — გვირგვინის ბეჭდვა 8–10 წუთში', 'SideLab P1-ის მოკლე პრეზენტაცია.', 'demo', 'Nevadent', 'pl'),
  ('aurora-endofiles', '0-n0ZHWiOlQ', 'Aurora — როგორ მზადდება ფაილი', 'Aurora ენდოფაილის წარმოების პროცესი ქარხნიდან.', 'demo', 'Eighteeth Sifary', 'en'),
  ('aurora-endofiles', '8Fs44U3CZK8', 'Aurora — რა არის შეფუთვაში', 'Aurora ფაილების შეფუთვის მიმოხილვა.', 'demo', 'Eighteeth Sifary', 'en'),
  ('e-style-gold-blue', 'eDlafD6MRfM', 'E-STYLE — ექსპერტის ლაივ ტრენინგი', 'E-STYLE ფაილების სრული ტრენინგი Dr. Filippo-სთან.', 'training', 'Eighteeth Sifary', 'en'),
  ('e-flex-mini', 'ZEkvSRailtI', 'E-FLEX სერია — თერმულად დამუშავებული ენდოფაილები', 'Eighteeth E-FLEX სერიის მოკლე მიმოხილვა.', 'marketing', 'Eighteeth Sifary', 'en'),
  ('e-flex-rt', 'ZEkvSRailtI', 'E-FLEX სერია — თერმულად დამუშავებული ენდოფაილები', 'Eighteeth E-FLEX სერიის მოკლე მიმოხილვა.', 'marketing', 'Eighteeth Sifary', 'en'),
  ('e-flex-path', 'ZEkvSRailtI', 'E-FLEX სერია — თერმულად დამუშავებული ენდოფაილები', 'Eighteeth E-FLEX სერიის მოკლე მიმოხილვა.', 'marketing', 'Eighteeth Sifary', 'en'),
  ('helios-600', 'dhCq0XwObaY', 'Helios 600 — სწრაფი და ზუსტი ინტრაორალური სკანერი', 'Helios 600-ის ოფიციალური პრეზენტაცია.', 'marketing', 'Eighteeth Sifary', 'en'),
  ('helios-600', 'R8qFnWjmKzk', 'Helios 600 — სრული თაღი 30 წამში', 'Institute of Digital Dentistry-ის მიმოხილვა.', 'demo', 'Institute of Digital Dentistry', 'en'),
  ('helios-500', 'fBL3mw8GXHk', 'Helios 500 — Unboxing', 'Helios 500 სკანერის გახსნა და კომპლექტაცია.', 'demo', 'Institute of Digital Dentistry', 'en'),
  ('helios-500', 'JAnlRi3rQvQ', 'Helios 500 — ხიდის სამუშაო პროცესი', 'ხიდის სკანირების სამუშაო პროცესი Eighteeth Digital Academy-დან.', 'training', 'Eighteeth Digital Academy', 'en'),
  ('nanopix-1-2', 'BizKLcPUiT4', 'NanoPix სერია — სენსორის გამოყენება', 'NanoPix სენსორების ოფიციალური ოპერაციული ვიდეო.', 'training', 'Eighteeth Sifary', 'en'),
  ('nanopix-1-2', 'hiT8J2nL3LM', 'NanoPix — Unboxing და პროგრამის დემონსტრაცია', 'Dr. Ash Mark აჩვენებს სენსორს და პროგრამას.', 'demo', 'Eighteeth Sifary', 'en'),
  ('brilliance-bp', 'UU0WNpl-yvg', 'Brilliance ლუპები — 3x გადიდება, Flip-Up', 'Brilliance ლუპების მოკლე მიმოხილვა.', 'marketing', 'Eighteeth Sifary', 'en'),
  ('wireless-z-plus', 'vw2IaskBeko', 'Wireless Z — გამოყენების ინსტრუქცია', 'უკაბელო განათების ოპერაციული გზამკვლევი.', 'training', 'EBIKO Dental', 'en'),
  ('wireless-z-plus', '_RX8_xkOOzg', 'Wireless Z — მიმოხილვა', 'Wireless Z უკაბელო განათების მიმოხილვა.', 'demo', 'DentSupplier Europe', 'en'),
  ('soga-smart-2', 'hj_DD1rogJo', 'SOGA Smart II — ანესთეზიის ინექცია', 'მწარმოებლის ოფიციალური ვიდეო.', 'training', 'SOGA.MEDICAL', 'en'),
  ('soga-smart-1', 'M2RUyepDdz0', 'SOGA Smart I — ანესთეზიის ინექცია', 'მწარმოებლის ოფიციალური ვიდეო.', 'training', 'SOGA.MEDICAL', 'en'),
  ('dental-laser', 'MGiBwoLoYDs', 'iLaser I Plus — 3 ტალღის სიგრძის დიოდური ლაზერი', '459 / 650 / 980 ნმ, რბილი ქსოვილის სამუშაოებისთვის.', 'demo', 'SOGA.MEDICAL', 'en'),
  ('ilaser-i-pro', 'BNJQZK5Jj_M', 'iLaser I Pro — მიმოხილვა', 'მწარმოებლის ოფიციალური ვიდეო.', 'demo', 'SOGA.MEDICAL', 'en'),
  ('piezo-surgery', '4LgYRUEIiLw', 'SOGA-B1 — ინსტალაცია და გამოყენება', 'პიეზო ქირურგიული აპარატის აწყობა და მუშაობა.', 'setup', 'SOGA', 'en'),
  ('piezo-surgery', 'unpEBiwjYY0', 'SOGA-B1 — რეჟიმები და სამუშაო რჩევები', 'სამუშაო რეჟიმები და პრაქტიკული რჩევები.', 'training', 'SOGA', 'en'),
  ('mona-5l-pro', 'FnWjLfg_lMA', 'Mona 5L Pro — ავტოკლავის გამოყენების ინსტრუქცია', 'ავტოკლავის გამოყენების ინსტრუქცია (უკრაინულად).', 'training', 'MG Dental Service', 'uk'),
  ('wisedent-br-164ap', '1hBy-mYpOaw', 'BR-164AP — მაღალსიჩქარიანი ბუნიკი', 'სამმაგი წყლის სპრეი და LED.', 'demo', 'WISEDENT', 'en'),
  ('wisedent-br-412k-implant', 'MLswxL4fo_w', 'Wisedent 20:1 იმპლანტის contra angle', 'იმპლანტოლოგიური contra angle-ის მიმოხილვა.', 'demo', 'WISEDENT', 'en'),
  ('wisedent-br-412k-ed-implant', 'lxUp9pnQSLs', 'Wisedent 20:1 დაშლადი იმპლანტის contra angle', 'დაშლადი 20:1 contra angle-ის მიმოხილვა.', 'demo', 'WISEDENT', 'en'),
  ('wisedent-br-422ss-15', 'j5YtD1M9zzs', 'Wisedent 1:5 LED contra angle', '1:5 LED contra angle-ის მიმოხილვა.', 'demo', 'WISEDENT', 'en'),
  ('wisedent-low-speed-contra-angle', 'QBFQGe1OyrU', 'Wisedent დაბალსიჩქარიანი ნაკრები', 'contra angle, ჰაერის მოტორი და სწორი ბუნიკი.', 'demo', 'WISEDENT', 'en'),
  ('wisedent-low-speed-air-motor', 'QBFQGe1OyrU', 'Wisedent დაბალსიჩქარიანი ნაკრები', 'contra angle, ჰაერის მოტორი და სწორი ბუნიკი.', 'demo', 'WISEDENT', 'en'),
  ('wisedent-low-speed-straight-handpiece', 'QBFQGe1OyrU', 'Wisedent დაბალსიჩქარიანი ნაკრები', 'contra angle, ჰაერის მოტორი და სწორი ბუნიკი.', 'demo', 'WISEDENT', 'en')
) as v(slug, yt, title, description, video_type, channel, lang)
join public.products p on p.slug = v.slug
where not exists (
  select 1 from public.academy_videos a
  where a.product_id = p.id and a.youtube_video_id = v.yt
);
