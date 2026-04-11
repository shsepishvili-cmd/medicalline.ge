-- =========================================
-- 02_seed.sql
-- Seed data for products, prices, academy
-- Run after 01_core.sql
-- =========================================

create unique index if not exists academy_items_type_title_uidx
  on public.academy_items (type, title);

-- PRODUCTS
insert into public.products (slug, name, category_slug, brand, short_desc, specs, sort_order) values
('helios-700', 'Helios 700', 'scan', 'Eighteeth', 'უკაბელო ინტრაორალური სკანერი — უმაღლესი სიზუსტე', '{"სიზუსტე":"0.005 mm","სენსორი":"CMOS","კავშირი":"Bluetooth + USB","წონა":"138 გ","OS":"Windows / Mac","გარანტია":"2 წელი"}', 1),
('helios-680', 'Helios 680', 'scan', 'Eighteeth', 'პირის ღრუს სკანერი პროფესიონალებისთვის', '{"სიზუსტე":"0.008 mm","სენსორი":"CMOS","კავშირი":"USB","წონა":"145 გ","OS":"Windows / Mac","გარანტია":"2 წელი"}', 2),
('helios-600', 'Helios 600', 'scan', 'Eighteeth', 'საიმედო ინტრაორალური სკანერი', '{"სიზუსტე":"0.010 mm","კავშირი":"USB","წონა":"155 გ","გარანტია":"1 წელი"}', 3),
('helios-500', 'Helios 500', 'scan', 'Eighteeth', 'საწყისი დონის სკანერი', '{"სიზუსტე":"0.012 mm","კავშირი":"USB","გარანტია":"1 წელი"}', 4),
('finscan-f350', 'FinScan F350', 'radio', 'LargeV', 'CBCT კომპიუტერული ტომოგრაფი + პანორამა', '{"FOV":"8×8 / 12×8 cm","Voxel":"0.1 mm","პანორამა":"ჩართული","პროგრამა":"SmartV-CD","გარანტია":"2 წელი"}', 1),
('hyperlight', 'HyperLight', 'radio', 'Eighteeth', 'პორტატული დენტალური რენტგენი', '{"სიხშირე":"70 kHz","კვება":"Li-Ion","წონა":"1.7 კგ","გარანტია":"1 წელი"}', 2),
('hyperlight-g', 'HyperLight-G', 'radio', 'Eighteeth', 'რენტგენი GPS სამიზნით', '{"სიხშირე":"70 kHz","სამიზნე":"ჩაშენებული","გარანტია":"1 წელი"}', 3),
('nanopix-1', 'NanoPix 1/2', 'radio', 'Eighteeth', 'ციფრული ვიზიოგრაფი', '{"სენსორი":"CMOS","USB":"2.0","გარანტია":"1 წელი"}', 4),
('e-connect-s-plus', 'E-Connect S+', 'endo', 'Eighteeth', 'ენდომოტორი ინტეგრირებული აპექს ლოკატორით', '{"ბატარეა":"2000 mAh","სიჩქარე":"600 rpm","მომენტი":"5 N·cm","აპექს":"ჩაშენებული","ეკრანი":"TFT ფერადი","გარანტია":"2 წელი"}', 1),
('e-connect-s', 'E-Connect S', 'endo', 'Eighteeth', 'ენდომოტორი', '{"სიჩქარე":"600 rpm","მომენტი":"4 N·cm","ეკრანი":"LCD","გარანტია":"1 წელი"}', 2),
('e-xtreme', 'E-xtreme', 'endo', 'Eighteeth', 'მაღალი სიმძლავრის ენდომოტორი', '{"სიჩქარე":"800 rpm","მომენტი":"6 N·cm","ეკრანი":"TFT","გარანტია":"2 წელი"}', 3),
('e-pex', 'E-PEX', 'endo', 'Eighteeth', 'აპექს ლოკატორი', '{"თაობა":"5th","ეკრანი":"ფერადი","სიზუსტე":"±0.5 mm","გარანტია":"1 წელი"}', 4),
('acuvision-x', 'Acuvision X', 'optics', 'Eighteeth', 'ქირურგიული დენტალური მიკროსკოპი', '{"გადიდება":"4-24x","განათება":"LED","კამერა":"4K HDMI","ფოკუსი":"ავტო","გარანტია":"2 წელი"}', 1),
('brilliance', 'Brilliance', 'optics', 'Eighteeth', 'დენტალური ლუპა', '{"გადიდება":"2.5x / 3.5x","FOV":"110 mm","სამუშაო დისტანცია":"420 mm","გარანტია":"1 წელი"}', 2),
('ultramint-pro', 'UltraMint Pro', 'hygiene', 'Eighteeth', 'პიეზო სკალერი', '{"სიხშირე":"28-36 kHz","სიმძლავრე":"3 დონე","ბოლო":"5 ტიპი","გარანტია":"1 წელი"}', 1),
('e-sanit', 'E-Sanit', 'hygiene', 'Eighteeth', 'B კლასის ავტოკლავი', '{"მოცულობა":"18 ლ","კლასი":"B","ციკლი":"18 წთ","ტემპ.":"134°C","გარანტია":"2 წელი"}', 2),
('hager-g4', 'Hager G4', 'partner', 'Hager', 'სტომატოლოგიური სავარძელი — პრემიუმ', '{"მოძრაობა":"ელექტრო","ეკრანი":"LCD","გარანტია":"3 წელი"}', 1),
('hager-h5', 'Hager H5', 'partner', 'Hager', 'სტომატოლოგიური სავარძელი', '{"მოძრაობა":"ელექტრო","გარანტია":"2 წელი"}', 2)
on conflict (slug) do update
set name = excluded.name,
    category_slug = excluded.category_slug,
    brand = excluded.brand,
    short_desc = excluded.short_desc,
    specs = excluded.specs,
    sort_order = excluded.sort_order,
    updated_at = now();

-- PRICES
insert into public.prices (product_id, price_gel, price_usd, installment_monthly, installment_months, note)
select p.id, v.price_gel, v.price_usd, v.inst_m, 12, v.note
from public.products p
join (values
  ('helios-700',       8490,  3100, 708,  'განვადება Credo-ს გავლით'),
  ('helios-680',       6290,  2300, 524,  'განვადება Credo-ს გავლით'),
  ('helios-600',       4890,  1790, 408,  null),
  ('helios-500',       3490,  1280, 291,  null),
  ('finscan-f350',    38500, 14100, 3208, 'ინსტალაცია + ტრენინგი ჩართული'),
  ('hyperlight',       1890,   690, 158,  null),
  ('hyperlight-g',     2190,   800, 183,  null),
  ('nanopix-1',        1290,   470, 108,  null),
  ('e-connect-s-plus', 1490,   545, 124,  null),
  ('e-connect-s',       990,   360,  83,  null),
  ('e-xtreme',         1790,   655, 149,  null),
  ('e-pex',             590,   215,  49,  null),
  ('acuvision-x',     12800,  4680, 1067, 'სასწავლო ტრენინგი ჩართული'),
  ('brilliance',       1190,   435,  99,  null),
  ('ultramint-pro',     890,   325,  74,  null),
  ('e-sanit',          2100,   768, 175,  null),
  ('hager-g4',        18500,  6760, 1542, 'მონტაჟი ჩართული'),
  ('hager-h5',        12900,  4715, 1075, 'მონტაჟი ჩართული')
) as v(slug, price_gel, price_usd, inst_m, note)
on p.slug = v.slug
on conflict (product_id) do update
set price_gel = excluded.price_gel,
    price_usd = excluded.price_usd,
    installment_monthly = excluded.installment_monthly,
    installment_months = excluded.installment_months,
    note = excluded.note,
    updated_at = now();

-- ACADEMY
insert into public.academy_items (type, title, description, duration_sec, sort_order) values
('video',   'Helios 700 — პირველი სკანირება',        'ნულიდან პირველ სკანამდე ნაბიჯ-ნაბიჯ', 522, 1),
('video',   'E-Connect S+ — კალიბრაცია და რეჟიმები', 'სწორი კალიბრაცია და AutoStop რეჟიმი', 735, 2),
('video',   'FinScan F350 — პაციენტის პოზიციონირება','CBCT სკანირების მომზადება',          390, 3),
('video',   'Helios 680 vs 700 — შედარება',           'რომელი სჯობს შენი კლინიკისთვის?',   300, 4),
('video',   'Acuvision X — მიკროსკოპის გამართვა',    'ოპტიმალური კონფიგურაცია',           486, 5),
('webinar', 'Helios 700 — ლაივ დემო ექიმებისთვის',   'პირდაპირი ეთერი კითხვა-პასუხით',   3600, 6),
('manual',  'E-Connect S+ — სრული სახელმძღვანელო',   'PDF ინსტრუქცია ქართულად',            null, 7),
('manual',  'FinScan F350 — სერვის მანუალი',          'ტექნიკური სახელმძღვანელო',          null, 8)
on conflict (type, title) do update
set description = excluded.description,
    duration_sec = excluded.duration_sec,
    sort_order = excluded.sort_order;
