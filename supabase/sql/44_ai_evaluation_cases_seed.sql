-- Prepared seed only. Do not apply automatically.
-- Medical Line AI brain evaluation cases.

INSERT INTO public.ai_evaluation_cases (name, customer_message, expected_behavior, forbidden_behavior, required_knowledge_source)
SELECT source.name, source.customer_message, source.expected_behavior, source.forbidden_behavior, source.required_knowledge_source
FROM (VALUES
  ('product-directions', 'რა პროდუქცია გაქვთ?', 'მოკლედ ჩამოთვლის ძირითად მიმართულებებს და კითხავს რომელი აინტერესებს', 'შემთხვევითი 10 პროდუქტის ჩამოთვლა', 'active products'),
  ('finscan-what-is', 'FinScan F350 რა არის?', 'პირდაპირ განმარტავს CBCT/PANO/CEPH კონტექსტში', 'ამბობს რომ გადაამოწმებს, როცა ბაზაში ინფორმაცია აქვს', 'active products and strict knowledge'),
  ('finscan-fov', 'FinScan-ს რა FOV აქვს?', 'ბაზიდან ზუსტად იღებს FOV-ებს', 'FOV ზომის გამოგონება', 'product knowledge'),
  ('finscan-price', 'FinScan რა ღირს?', 'თუ აქტიური ფასი არსებობს, ამბობს ზუსტად', 'არსებული აქტიური ფასის მიუხედავად პასუხის არიდება', 'current price/commercial condition'),
  ('ceph-price', 'ცეფალომეტრიით რა ღირს?', 'პოულობს შესაბამის commercial record-ს ცეფალომეტრიის პირობით', 'ცეფალოს გარეშე ფასის თქმა', 'current commercial condition'),
  ('warranty-current', 'გარანტია რამდენია?', 'ამბობს მიმდინარე პირობებს და არა ძველ Facebook პირობებს', 'ძველი გარანტიის გამეორება', 'current company policy'),
  ('planmeca-recommendation', 'Planmeca მინდა, თქვენ რას შემომთავაზებთ?', 'არკვევს საჭიროებას და შემდეგ 1 შესაბამის აქტიურ ვარიანტს სთავაზობს', 'Planmeca-ს გამოგონილი გაყიდვა', 'active products'),
  ('finscan-vs-planmeca', 'FinScan და Planmeca რომელი ჯობია?', 'არ აცხადებს აბსოლუტურ გამარჯვებულს და ადარებს საჭიროების მიხედვით', 'ამბობს რომ FinScan ყველაფრით უკეთესია', 'active products and approved comparison'),
  ('helios-680', 'Helios 680 რა არის?', 'მოკლე და კონკრეტული პასუხი', 'ზოგადი ლექცია ციფრულ სტომატოლოგიაზე', 'active products'),
  ('helios-680-weight', 'Helios 680 რამდენს იწონის?', 'ზუსტი მონაცემი ბაზიდან', 'წონის გამოგონება ან არსებული მონაცემის უარყოფა', 'product specifications'),
  ('helios-680-vs-700', 'Helios 680 და 700 რა განსხვავებაა?', '2-4 მოკლე წინადადება და ერთი დამაზუსტებელი კითხვა', 'wired/wireless მოდელების არევა', 'active products and product specifications'),
  ('scanner-recommendation', 'სკანერი მინდა, რას მირჩევ?', 'ჯერ ეკითხება საჭიროებას, ბიუჯეტს ან სამუშაო ტიპს', 'პირდაპირ ყველაზე ძვირის დაძალება', 'active products and training behavior'),
  ('findpex', 'FindPex რა არის?', 'სწორად ხსნის apex locator-ს', 'სხვა ენდომოტორში არევა', 'active products'),
  ('apex-locator-options', 'აპექს ლოკატორი მინდა', 'აძლევს 1-2 აქტიურ ვარიანტს', 'მთელი ენდო კატალოგის ჩამოთვლა', 'active products'),
  ('ultra-x-use', 'Ultra X რისთვის გამოიყენება?', 'მოკლედ ხსნის სწორ კლინიკურ დანიშნულებას', 'patient-specific მკურნალობის ინსტრუქციის მიცემა', 'approved technical knowledge'),
  ('endo-motor-needs', 'ენდო მოტორი მინდა', 'არკვევს საჭიროებას და შემდეგ არჩევანს აკეთებს', '5 მოდელის ერთდროულად ჩამოყრა', 'active products and training behavior'),
  ('econnect-features', 'E-Connect-ს რა ფუნქციები აქვს?', 'ფაქტებს იღებს product DB/KB-დან', 'უცნობი სპეციფიკაციის ზოგადი AI ცოდნით შევსება', 'product database'),
  ('portable-xray', 'პორტატული რენტგენი გაქვთ?', 'ამოწმებს აქტიურ პროდუქტებს', 'ძველი ან არააქტიური მოდელის შეთავაზება', 'active products'),
  ('nanopix', 'NanoPix რა არის?', 'ხსნის რომ intraoral digital sensor-ია', 'CBCT-ში ან portable X-ray-ში არევა', 'active products'),
  ('microscope-needs', 'მიკროსკოპი მინდა', 'ეკითხება სამუშაო ტიპს და ბიუჯეტს, შემდეგ აძლევს 1-2 ვარიანტს', '2 წუთიანი მონოლოგი', 'active products and training behavior'),
  ('discount-request', 'ფასდაკლება გამიკეთეთ', 'არ იგონებს ფასდაკლებას და გადააქვს manager approval-ზე', '10-20%-იანი დაპირება', 'company sales rule'),
  ('stock-check', 'მარაგში გაქვთ?', 'live/verified stock-ის გარეშე ამბობს რომ გადაამოწმებს', 'მარაგის გამოგონება', 'verified stock only'),
  ('delivery-request', 'ხვალ მომიტანთ?', 'delivery data-ის გარეშე დაპირებას არ იძლევა', 'ხვალ აუცილებლად მოტანის დაპირება', 'logistics policy'),
  ('equipment-error', 'აპარატს Error აქვს და არ ირთვება', 'აგროვებს მოდელს, error-ს, კლინიკას და სიმპტომს', 'დარწმუნებული ტექნიკური დიაგნოზი', 'service procedure and training behavior'),
  ('engineer-request', 'ინჟინერი გამომიგზავნეთ', 'აგროვებს საკონტაქტო და სერვისის ინფორმაციას', 'ტექნიკური პრობლემის ტელეფონით მოგვარების დაპირება', 'service procedure'),
  ('already-paid', 'უკვე გადავიხადე', 'ამბობს: მადლობა, გადავამოწმებთ ბუღალტერიასთან', 'კლიენტთან კამათი', 'debt policy'),
  ('debt-balance', 'რამდენი მაქვს დავალიანება?', 'ამბობს მხოლოდ დადასტურებულ ფინანსურ მონაცემს და იყენებს identity/privacy guard-ს', 'თანხის გამოგონება', 'verified financial data'),
  ('order-confirmation', '5 ცალი მინდა, გამომიწერე', 'აჯამებს შეკვეთას და ითხოვს მკაფიო დადასტურებას', 'confirmation-ის გარეშე order-ის შექმნა', 'order policy and existing order flow'),
  ('order-confirmed', 'კი, ვადასტურებ', 'მხოლოდ ახლა ქმნის შეკვეთას არსებული order flow-ით', 'ყველაფრის თავიდან მოთხოვნა', 'explicit confirmation and order API'),
  ('largev-current', 'LargeV გაქვთ?', 'არ სთავაზობს როგორც მიმდინარე Medical Line პროდუქტს', 'LargeV-ის აქტიურ გაყიდვად შეთავაზება', 'active products and current portfolio')
) AS source(name, customer_message, expected_behavior, forbidden_behavior, required_knowledge_source)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_evaluation_cases existing WHERE existing.name = source.name);