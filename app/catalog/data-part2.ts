export const products = [
  { 
    id: 28, 
    slug: "hyperlight",
    name: "HyperLight რენტგენი", 
    img: "/images/hyperlight.jpg", 
    cat: "რადიოლოგია", 
    description: "პორტატული რენტგენი მაღალი ხარისხის სურათებისთვის.", 
    specs: ["65kV / 2.5mA", "ფოკალური ლაქა: 0.4მმ", "მსუბუქი: 1.8კგ"],
    aiFeatures: [{ icon: 'shield', title: 'Rad-Shield', desc: 'ორმაგი დაცვა ექიმის უსაფრთხოებისთვის.' }]
  },
  { 
    id: 29, 
    slug: "hyperlight-g",
    name: "HyperLight-G რენტგენი", 
    img: "/images/hyperlightg.png", 
    cat: "რადიოლოგია", 
    description: "Gun Type პორტატული რენტგენი.", 
    specs: ["მოსახერხებელი Grip", "კრისტალური გამოსახულება"] 
  },
  { 
    id: 30, 
    slug: "hyperlight-m",
    name: "HyperLight-M რენტგენი ციფრული სამიზნით", 
    img: "/images/hyperlightm.png", 
    cat: "რადიოლოგია", 
    description: "ულტრა-კომპაქტური პორტატული რენტგენი.", 
    specs: ["მინიმალური დასხივება", "ინტუიციური ეკრანი"] 
  },
  { 
    id: 31, 
    slug: "nanopix-1-2",
    name: "NanoPix 1 / 2 ვიზიოგრაფი", 
    img: "/images/nanopix1.png", 
    cat: "რადიოლოგია", 
    description: "ციფრული RVG სენსორი CSI ტექნოლოგიით.", 
    specs: ["რეზოლუცია: 25 lp/mm", "IP68 წყალგამძლეობა"] 
  },
  { 
    id: 32, 
    slug: "nanopix-1-5",
    name: "NanoPix 1.5 ვიზიოგრაფი", 
    img: "/images/nanopix1.5.png", 
    cat: "რადიოლოგია", 
    description: "უნივერსალური ზომის სენსორი.", 
    specs: ["კომფორტული პაციენტისთვის", "ერგონომიული ფორმა"] 
  },
  { 
    id: 33, 
    slug: "nanopix-e-1-3",
    name: "NanoPix-E 1.3 ვიზიოგრაფი", 
    img: "/images/nanopix1.3.png", 
    cat: "რადიოლოგია", 
    description: "ეკონომიური სერიის სენსორი.", 
    specs: ["მოსახერხებელი პროგრამა", "ზუსტი დიაგნოსტიკა"] 
  },
  {
    id: 34,
    slug: "le-ray-w",
    name: "LifeDent Le Ray W კედლის რენტგენი",
    img: "/images/le-ray-w.jpg",
    cat: "რადიოლოგია",
    description: "LifeDent Le Ray W არის კედელზე სამონტაჟო დენტალური რენტგენის აპარატი მაღალი სიხშირის DC გენერატორით, 4.3 ინჩიანი ფერადი სენსორული ეკრანით და სტაბილური გამოსახულებით ყოველდღიური ინტრაორალური დიაგნოსტიკისთვის.",
    specs: [
      "კედელზე სამონტაჟო კონსტრუქცია zero-drift პოზიციონირებით",
      "მაღალი სიხშირის DC constant voltage ტექნოლოგია",
      "4.3 ინჩიანი ფერადი სენსორული ეკრანი",
      "3 ექსპოზიციის რეჟიმი სხვადასხვა მიმღებისთვის",
      "მილის ძაბვა: 70kV; ანოდის დენი: 2mA",
      "ფოკალური ლაქა: 0.4მმ",
      "ექსპოზიციის დრო: 0.02-2.00 წმ",
      "კვება: 220V, 50/60Hz; სიმძლავრე: 400VA"
    ],
    aiFeatures: [
      { icon: 'shield', title: 'Stable Output', desc: 'DC გენერატორი და ძაბვის კორექცია ეხმარება სტაბილურ რენტგენ გამოსახულებას.' },
      { icon: 'zap', title: 'Fast Touch UI', desc: 'სწრაფი პარამეტრების არჩევა კბილის პოზიციისა და პაციენტის ზომის მიხედვით.' }
    ]
  },
  {
    id: 35, 
    slug: "finscan-f350",
    name: "FinScan F350 კომპიუტერული ტომოგრაფი", 
    img: "/images/finscan.png", 
    cat: "რადიოლოგია", 
    description: "FinScan F350 არის კლინიკისთვის განკუთვნილი 3-ერთში CBCT სისტემა, რომელიც აერთიანებს 3D ტომოგრაფიას, პანორამულ გადაღებას და ცეფალომეტრიის სამუშაო პროცესს. აპარატი გამოდგება იმპლანტოლოგიის, ენდოდონტიის, ქირურგიისა და ყოველდღიური დიაგნოსტიკისთვის.", 
    specs: [
      "FOV: 16x10 სმ დიდი დიაგნოსტიკური არე",
      "3-ერთში სისტემა: CT, Pano, Ceph workflow",
      "Canon რენტგენის მილი სტაბილური გამოსახულებისთვის",
      "AI რეკონსტრუქცია და მეტალის არტეფაქტების შემცირება",
      "ინსტალაცია, კალიბრაცია და გუნდის ტრენინგი Medical Line-ისგან",
      "სერვისული მხარდაჭერა და სამუშაო პროტოკოლების დანერგვა"
    ], 
    aiFeatures: [
      { icon: 'brain', title: 'Smart MAR', desc: 'მეტალის არტეფაქტების AI გასუფთავება.' },
      { icon: 'shield', title: 'Clinical Workflow', desc: 'იმპლანტის დაგეგმვა, ქირურგია და ენდოდონტიური დიაგნოსტიკა ერთ სისტემაში.' }
    ] 
  },
  { 
    id: 36, 
    slug: "helios-700",
    name: "Helios 700 უკაბელო სკანერი", 
    img: "/images/helios700.png", 
    cat: "ციფრული სკანერები", 
    description: "Helios 700 არის უკაბელო ინტრაორალური სკანერი Wi-Fi 6 კავშირით, სწრაფი სრული თაღის სკანირებით და AI ფილტრაციით. შექმნილია კლინიკის ყოველდღიური ციფრული ანაბეჭდებისთვის, ორთოპედიული სამუშაოებისთვის, aligner workflow-სთვის და ლაბორატორიასთან სწრაფი ფაილის გაზიარებისთვის.", 
    specs: [
      "უსადენო მუშაობა Wi-Fi 6 ტექნოლოგიით",
      "სიზუსტე: 16μm",
      "წონა: 245გ",
      "სრული თაღის სკანირება 30 წამამდე",
      "AI ფილტრაცია ენისა და ლოყის ავტომატური მოცილებისთვის",
      "ლაბორატორიასთან სწრაფი ფაილის გაზიარება"
    ], 
    aiFeatures: [
      { icon: 'brain', title: 'AI Filter', desc: 'აშორებს ენას და ლოყას სკანირებისას.' },
      { icon: 'zap', title: 'Fast Scan', desc: 'სრული თაღის სწრაფი სკანირება ყოველდღიური სამუშაოსთვის.' }
    ] 
  },
  { 
    id: 37, 
    slug: "helios-680",
    name: "Helios 680 პირის ღრუს სკანერი", 
    img: "/images/helios680.png", 
    cat: "ციფრული სკანერები", 
    description: "ულტრა-მსუბუქი სადენიანი სკანერი (161გ).", 
    specs: ["წონა: 161გ", "Compact Head"] 
  },
  { 
    id: 38, 
    slug: "helios-600",
    name: "Helios 600", 
    img: "/images/helios600.png", 
    cat: "ციფრული სკანერები", 
    description: "მაღალი წარმადობის სკანერი.", 
    specs: ["AI Cloud პლატფორმა", "რეალური ფერები"] 
  },
  { 
    id: 39, 
    slug: "helios-500",
    name: "Helios 500 პირის ღრუს სკანერი", 
    img: "/images/helios500.png", 
    cat: "ციფრული სკანერები", 
    description: "საიმედო სკანერი ციფრული დასაწყისისთვის.", 
    specs: ["მაღალი სიზუსტე", "მარტივი ინტერფეისი"] 
  },
  { 
    id: 40, 
    slug: "acuvision-x",
    name: "Acuvision X ქირურგიული მიკროსკოპი", 
    img: "/images/acuvisionx.jpg", 
    cat: "ოპტიკა", 
    description: "სტომატოლოგიური მიკროსკოპი 4K ვიზუალიზაციით.", 
    specs: ["Focus 200-450mm", "4K ჩაშენებული კამერა"] 
  },
  { 
    id: 41, 
    slug: "brilliance",
    name: "Brilliance დენტალური ლუპა", 
    img: "/images/brilliance.jpg", 
    cat: "ოპტიკა", 
    description: "პროფესიონალური სტომატოლოგიური ლუპები.", 
    specs: ["Galilean სისტემა", "მოსახერხებელი Flip-up"] 
  },
  { 
    id: 42, 
    slug: "brilliance-bp",
    name: "Brilliance BP დენტალური ლუპა", 
    img: "/images/brilliancebp.png", 
    cat: "ოპტიკა", 
    description: "სპორტული ჩარჩოს მქონე ლუპები.", 
    specs: ["ულტრა-მსუბუქი", "რეგულირებადი ცხვირის საყრდენი"] 
  },
  { 
    id: 43, 
    slug: "brilliance-48",
    name: "Brilliance 48° დენტალური ლუპა", 
    img: "/images/brilliance48.png", 
    cat: "ოპტიკა", 
    description: "ერგონომიული ერგო-ლუპები.", 
    specs: ["Ergo-Prism ტექნოლოგია", "კისრის დაცვა"] 
  },
  { 
    id: 44, 
    slug: "brilliance-48-pro",
    name: "Brilliance 48° Pro დენტალური ლუპა", 
    img: "/images/brilliance48pro.jpg", 
    cat: "ოპტიკა", 
    description: "პრემიუმ ერგო-ლუპები Schott მინებით.", 
    specs: ["მაქსიმალური დეტალიზაცია", "პრემიუმ ოპტიკა"], 
    aiFeatures: [{ icon: 'shield', title: 'Posture AI', desc: 'ხერხემლის დაცვა 48° გარდატეხით.' }] 
  },
  { 
    id: 45, 
    slug: "wireless-z-plus",
    name: "Wireless Z+ უკაბელო განათება", 
    img: "/images/wirelessz.jpg", 
    cat: "ოპტიკა", 
    description: "უსადენო განათება ლუპებისთვის.", 
    specs: ["100,000 Lux", "წონა: 12გ"] 
  },
  { 
    id: 46, 
    slug: "motorsurg",
    name: "MotorSurg ფიზიოდისპენსერი", 
    img: "/images/motorsurg.png", 
    cat: "ქირურგია", 
    description: "პროფესიონალური ფიზიოდისპენსერი.", 
    specs: ["80 N.cm Torque", "Brushless ძრავი"] 
  },
  { 
    id: 47, 
    slug: "motorturbo-e-asp1",
    name: "Motorturbo & E-asp1 ელექტროძრავა", 
    img: "/images/motorturbo.png", 
    cat: "ქირურგია", 
    description: "ქირურგიული მოტორი და ასპირაცია.", 
    specs: ["ძლიერი ასპირაცია", "ჩუმი მუშაობა"] 
  },
  { 
    id: 48, 
    slug: "surfyone",
    name: "SurfyOne სონიკ აქტივატორი", 
    img: "/images/surfyone.png", 
    cat: "ქირურგია", 
    description: "სონიკ აქტივაოტორი ირიგაციისთვის.", 
    specs: ["სენსორული მართვა", "ფართო თავაკების ნაკრები"] 
  },
  { 
    id: 49, 
    slug: "curingpen-x",
    name: "CuringPen-X პოლიმერიზატორი", 
    img: "/images/curinpenx.png", 
    cat: "ენდოდონტია", 
    description: "პოლიმერიზაციის ნათურა კარიეს-დეტექტორით.", 
    specs: ["3000 mW/cm²", "კარიეს დეტექტორი"] 
  },
  { 
    id: 50, 
    slug: "curingpen",
    name: "CuringPen პოლიმერიზატორი", 
    img: "/images/curingpen.jpg", 
    cat: "ენდოდონტია", 
    description: "კლასიკური უსადენო ნათურა.", 
    specs: ["Broadband LED", "4 რეჟიმი"] 
  },
  { 
    id: 51, 
    slug: "curingpen-e",
    name: "CuringPen-E პოლიმერიზატორი", 
    img: "/images/curinpene.png", 
    cat: "ენდოდონტია", 
    description: "ეკონომიური და მსუბუქი ნათურა.", 
    specs: ["სწრაფი დამუხტვა", "მარტივი მართვა"] 
  },
  { 
    id: 52, 
    slug: "softouch",
    name: "SofTouch განათება კაბელით", 
    img: "/images/softouch.jpg", 
    cat: "ოპტიკა", 
    description: "ბინოკულარის განათება კაბელით.", 
    specs: ["რეგულირებადი სიმძლავრე", "ძლიერი აკუმულატორი"] 
  },
  { 
    id: 53, 
    slug: "e-sanit",
    name: "E-Sanit B კლასის ავტოკლავი", 
    img: "/images/blog/e-sanit-autoclave/e-sanit-01.jpg", 
    cat: "სტერილიზაცია", 
    description: "B-კლასის ავტოკლავი.", 
    specs: ["23L მოცულობა", "ჩაშენებული პრინტერი"] 
  },
  // ❗️ სხვა პარტნიორი ბრენდები ❗️
  { 
    id: 54, 
    slug: "hager-g4",
    name: "სტომატოლოგიური სავარძელი Hager G4", 
    img: "/images/hager-g4.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "პრემიუმ კლასის ერგონომიული სტომატოლოგიური დანადგარი მულტიფუნქციური მართვით.", 
    specs: ["სენსორული პანელი", "LED უჩრდილო განათება", "ექიმის ერგონომიული სკამი"] 
  },
  { 
    id: 55, 
    slug: "hager-p1",
    name: "სტომატოლოგიური სავარძელი Hager P1", 
    img: "/images/hager-p1.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "კომფორტული და საიმედო სტომატოლოგიური სავარძელი ყოველდღიური ინტენსიური მუშაობისთვის.", 
    specs: ["გაძლიერებული კარკასი", "მარტივი წმენდა", "რბილი ტყავის საფარი"] 
  },
  { 
    id: 56, 
    slug: "hager-h5",
    name: "სტომატოლოგიური სავარძელი Hager H5", 
    img: "/images/hager-h5.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "ინოვაციური დიზაინის მქონე სტომატოლოგიური დანადგარი გაძლიერებული ფუნქციონალით.", 
    specs: ["პრემიუმ ოპტიკა", "ინტეგრირებული მიკრომოტორი", "ინტუიციური მართვა"] 
  },
  { 
    id: 57, 
    slug: "hager-g3",
    name: "სტომატოლოგიური სავარძელი Hager G3", 
    img: "/images/hager-g3.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "ბაზისური, გამძლე და პრაქტიკული დანადგარი ნებისმიერი კლინიკისთვის.", 
    specs: ["საიმედო ჰიდრავლიკა", "კომპაქტური დიზაინი", "სტანდარტული განათება"] 
  },
  { 
    id: 58, 
    slug: "hager-g5",
    name: "სტომატოლოგიური სავარძელი Hager G5", 
    img: "/images/hager-g5.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "უმაღლესი ტექნოლოგიებით აღჭურვილი სავარძელი პაციენტის და ექიმის მაქსიმალური კომფორტისთვის.", 
    specs: ["პროგრამირებადი პოზიციები", "Touch Screen", "VIP კლასის კომფორტი"] 
  },
  { 
    id: 59, 
    slug: "philden-s500",
    name: "Philden S500 მშრალი ჩარხი", 
    img: "/images/philden-s500.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "5-ღერძიანი მშრალი ფრეზირების ჩარხი (Milling Machine) ცირკონისა და PMMA-სთვის.", 
    specs: ["5-ღერძიანი მუშაობა", "მაღალი სიზუსტე", "სწრაფი ფრეზირება"] 
  },
  { 
    id: 60, 
    slug: "philden-s400",
    name: "Philden S400 სველი ჩარხი", 
    img: "/images/philden-s400.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "მაღალი სიზუსტის სველი ფრეზირების ჩარხი მინის კერამიკისა და ტიტანისთვის.", 
    specs: ["სველი ფრეზირება", "ძლიერი გაგრილების სისტემა", "მიკრო-სიზუსტე"] 
  },
  { 
    id: 61, 
    slug: "sintering-furnace",
    name: "სინთერიზაციის ღუმელი", 
    img: "/images/sintering-furnace.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "სწრაფი და ეფექტური სინთერიზაციის ღუმელი ცირკონის გვირგვინების ლაბორატორიული დამუშავებისთვის.", 
    specs: ["სწრაფი გაცხელება", "პროგრამირებადი ციკლები", "მაღალი ტემპერატურის კონტროლი"] 
  },
  { 
    id: 62, 
    slug: "dental-laser",
    name: "დენტალური ლაზერი  I LASER I PLUS-3", 
    img: "/images/dental-laser.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "დიოდური ლაზერი რბილი ქსოვილების ქირურგიის, პერიოდონტოლოგიისა და ენდოდონტიისთვის.", 
    specs: ["უმტკივნეულო ქირურგია", "სწრაფი შეხორცება", "რამდენიმე ტალღის სიგრძე"] 
  },
  { 
    id: 63, 
    slug: "piezo-surgery",
    name: "დენტალური პიეზო ქირურგიული აპარატი bone surgery-B1", 
    img: "/images/piezo-surgery.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "ულტრაბგერითი ქირურგიული სისტემა ძვლოვანი ქსოვილის უსაფრთხო და ატრავმული მოდელირებისთვის.", 
    specs: ["მაღალი სიმძლავრე", "ატრავმული ჭრა", "ფართო თავაკების არჩევანი"] 
  },
  { 
    id: 64, 
    slug: "air-polisher",
    name: "აირ-ჭავლოვანი ბუნიკი TURBO JET", 
    img: "/images/air-polisher.jpg", 
    cat: "სხვა პარტნიორი ბრენდები", 
    description: "პროფესიონალური აირ-ჭავლოვანი (Air-Flow) სისტემა კბილების ნადების სწრაფი და უსაფრთხო მოშორებისთვის.", 
    specs: ["360° მბრუნავი თავაკი", "მარტივი წმენდა", "ერგონომიული დიზაინი"] 
  }
  ,
  {
    id: 65,
    slug: "mona-5l-pro",
    name: "Mona 5L Pro ავტოკლავი",
    img: "/images/mona-5l-pro.webp",
    cat: "სტერილიზაცია",
    description: "კომპაქტური მაღალი წნევის ორთქლის სტერილიზატორი სწრაფი სტერილიზაციისთვის.",
    specs: [
      "5L მოცულობა",
      "უსწრაფესი რეჟიმი: 10 წუთი",
      "Touch Screen, პრინტერი და SD Card",
      "7 სტერილიზაციის რეჟიმი და 20 პროგრამა",
      "მაქსიმალური ტემპერატურა: 137℃",
      "მაქსიმალური წნევა: 0.24 MPa"
    ]
  },
  {
    id: 66,
    slug: "ilaser-i-pro",
    name: "ILaser I Pro მრავალტალღიანი დიოდური ლაზერი",
    img: "/images/ilaser-i-pro.png",
    cat: "სხვა პარტნიორი ბრენდები",
    description: "ILaser I Pro არის დესკტოპ დიოდური ლაზერი 450nm, 650nm და 980nm დამოუკიდებლად რეგულირებადი ტალღებით. განკუთვნილია რბილი ქსოვილების ქირურგიისთვის, ჰემოსტაზისთვის, ენდოდონტიისა და პერიოდონტოლოგიის სამუშაოებისთვის, კბილების გათეთრების აქტივაციისთვის და ფოტობიომოდულაციისთვის.",
    specs: [
      "სამი დამოუკიდებლად რეგულირებადი ტალღა: 450nm, 650nm, 980nm",
      "450nm ლურჯი ტალღა კბილების გათეთრების გელის აქტივაციისა და ჰემოსტაზისთვის",
      "980nm ინფრაწითელი ტალღა რბილი ქსოვილების ქირურგიისთვის, ენდოდონტიისა და პერიოდონტოლოგიისთვის",
      "650nm წითელი ტალღა PBM / LLLT ფოტობიომოდულაციისთვის",
      "1064nm ახლო ინფრაწითელი აპლიკაციები ღრმა რბილი ქსოვილებისა და პერიოდონტოლოგიური სამუშაოებისთვის",
      "17 კლინიკური აპლიკაცია 8 სტომატოლოგიურ მიმართულებაში"
    ],
    aiFeatures: [
      { icon: "zap", title: "Multi Wavelength", desc: "450nm, 650nm და 980nm ტალღების კომბინაცია სხვადასხვა კლინიკური ამოცანისთვის." },
      { icon: "shield", title: "Precise Coagulation", desc: "დაბალ სიმძლავრეზეც ეფექტური ჰემოსტაზი და რბილი ქსოვილების კონტროლი." },
      { icon: "brain", title: "Clinical Modes", desc: "გათეთრება, ქირურგია, Endo/Perio, PBM/LLLT და TMJ პროტოკოლები ერთ სისტემაში." }
    ]
  },
  {
    id: 67,
    slug: "soga-smart-2",
    name: "SOGA-SMART II ელექტრონული ანესთეზიის შპრიცი",
    img: "/images/soga-smart-2.png",
    cat: "ანესთეზია",
    description: "SOGA-SMART II არის ახალი თაობის კომფორტული კონტროლის ელექტრონული შპრიცი ადგილობრივი ანესთეზიისთვის. CCS/CCLAD ტექნოლოგია უზრუნველყოფს ხსნარის მუდმივ და კონტროლირებად მიწოდებას, რაც ამცირებს ინექციის დისკომფორტს და ეხმარება ექიმს ზუსტ, განმეორებად სამუშაო პროცესში.",
    specs: [
      "CCS ტექნოლოგია CCLAD სისტემის ბაზაზე",
      "მუდმივი ნაკადი და ნელი აჩქარების ფუნქცია კომფორტული ინექციისთვის",
      "3 სიჩქარე: High, Low და PDL",
      "ერგონომიული Pen-style დიზაინი და 65გ მსუბუქი კორპუსი",
      "უკაბელო მუშაობა, კონსოლისა და ფეხის პედლის გარეშე",
      "LED ეკრანი: On / Off / Reset / Unlock",
      "თავსებადია ექიმის მიერ არჩეულ სტანდარტულ ნემსებთან",
      "დამამშვიდებელი მუსიკა ბავშვებისა და მოზრდილებისთვის"
    ],
    aiFeatures: [
      { icon: "shield", title: "Comfort Flow", desc: "კონტროლირებული ნაკადი ამცირებს ჭარბი სიჩქარით გამოწვეულ ტკივილს." },
      { icon: "zap", title: "Cordless", desc: "კაბელის, კონსოლისა და ფეხის აქტივაციის გარეშე უფრო თავისუფალი მუშაობისთვის." },
      { icon: "check", title: "Precise Grip", desc: "Pen-style ფორმა ნემსთან ახლოს მაქსიმალური კონტროლისთვის." }
    ]
  },
  {
    id: 68,
    slug: "soga-smart-1",
    name: "SOGA-Smart I ინტრალიგამენტური ანესთეზიის სისტემა",
    img: "/images/soga-smart-1.png",
    cat: "ანესთეზია",
    description: "SOGA-Smart I არის ელექტრონული ანესთეზიის სისტემა, შექმნილი periodontal ligament (PDL) ინექციებისთვის. DPS ტექნოლოგია რეალურ დროში კითხულობს ნემსის წვერზე არსებულ წნევას და ეხმარება ექიმს სწორად განსაზღვროს ნემსის მდებარეობა ინტრალიგამენტური ანესთეზიისას.",
    specs: [
      "PDL რეჟიმი periodontal ligament ინექციებისთვის",
      "DPS Dynamic Pressure Sensing ტექნოლოგია რეალურ დროში წნევის უკუკავშირით",
      "Smart სისტემა ეხმარება periodontal ligament ქსოვილის იდენტიფიცირებაში",
      "ერთშეხებით ინექცია და ასპირაცია",
      "ცალკე ასპირაციის ღილაკი",
      "304 stainless steel cartridge holder",
      "ჩაშენებული smart chip ბოლო რეჟიმის დამახსოვრებით და ინექციების დათვლით",
      "3 ინექციის რეჟიმი: High, Low და PDL",
      "ინექციის მოცულობა: 1.8ml",
      "High mode: 1.8ml/1min; Low mode: 1.8ml/2min; PDL mode: 1.8ml/4min",
      "ზომა: 175mm x 16mm; წონა: 70გ"
    ],
    aiFeatures: [
      { icon: "brain", title: "DPS Feedback", desc: "რეალურ დროში წნევის მონიტორინგი ნემსის წვერთან ზუსტი PDL პოზიციისთვის." },
      { icon: "shield", title: "PDL Mode", desc: "სპეციალური რეჟიმი ინტრალიგამენტური ინექციების კონტროლისთვის." },
      { icon: "zap", title: "One-touch", desc: "ინექცია და ასპირაცია მარტივი შეხებით, ავტომატურად მორგებული სიჩქარეებით." }
    ]
  },
  {
    id: 70,
    slug: "water-distiller-benchtop-wdis",
    name: "Water Distiller Benchtop წყლის დისტილატორი",
    img: "/images/catalog/water-distiller-benchtop.jpg",
    cat: "სტერილიზაცია",
    brand: "Pacific Medical",
    description: "კომპაქტური desktop წყლის დისტილატორი, რომელიც კლინიკას ავტოკლავებისთვის შესაფერისი დისტილირებული წყლის მომზადებაში ეხმარება.",
    specs: [
      "SKU / Order Code: WDIS",
      "უჟანგავი ფოლადის ავზი",
      "სიმძლავრე: 750W",
      "წარმოება: 1 ლიტრი საათში",
      "შიდა ზომა: 180 x 200 mm",
      "გარე ზომა: 290 x 290 x 390 mm",
      "წონა: 3.5 kg",
      "CE Mark"
    ],
    aiFeatures: [
      { icon: "shield", title: "Autoclave Water", desc: "ავტოკლავებისთვის საჭირო დისტილირებული წყლის სტაბილური მომზადება კლინიკაში." },
      { icon: "zap", title: "1L / Hour", desc: "კომპაქტური ფორმატი და საათში 1 ლიტრამდე წარმოება ყოველდღიური სტერილიზაციისთვის." },
      { icon: "check", title: "Stainless Tank", desc: "უჟანგავი ფოლადის ავზი და CE Mark პრაქტიკული ინფექციის კონტროლის workflow-სთვის." }
    ]
  },
  {
    id: 71,
    slug: "vevor-ultrasonic-cleaner-2l",
    name: "VEVOR 2L ულტრაბგერითი სასტერილიზაციო აბაზანა",
    img: "/images/catalog/vevor-ultrasonic-cleaner-2l.jpg",
    cat: "სტერილიზაცია",
    brand: "VEVOR",
    description: "კომპაქტური 2 ლიტრიანი ულტრაბგერითი აბაზანა ინსტრუმენტების, მცირე მეტალის ნაწილების და კლინიკური აქსესუარების წინასწარი ღრმა წმენდისთვის სტერილიზაციამდე.",
    specs: [
      "SKU: JPS-10ACSBQXJ0001V3",
      "ავზის მოცულობა: 1.8-2L",
      "მასალა: 304 Stainless Steel",
      "ულტრაბგერითი სიხშირე: 40kHz",
      "ულტრაბგერითი სიმძლავრე: 60W",
      "გათბობის სიმძლავრე: 100W",
      "კვება: AC220V / 50Hz",
      "ტაიმერი: 0-30 წუთი LED ციფრული ეკრანით",
      "Transducer: 1 set",
      "ავზის ზომა: 150 x 140 x 100 mm",
      "პროდუქტის ზომა: 177 x 165 x 220 mm",
      "კომპლექტაცია: აბაზანა, კალათა, უჟანგავი ფოლადის თავსახური, კვების კაბელი, ინსტრუქცია"
    ],
    aiFeatures: [
      { icon: "zap", title: "40kHz Deep Cleaning", desc: "ულტრაბგერითი ბუშტუკები ეხმარება რთული ფორმის ინსტრუმენტების ღრმა და სწრაფ წმენდას." },
      { icon: "shield", title: "Pre-sterilization", desc: "გამოდგება სტერილიზაციამდე ინსტრუმენტების, მეტალის ნაწილების და აქსესუარების წინასწარი დამუშავებისთვის." },
      { icon: "check", title: "Digital Timer", desc: "0-30 წუთიანი ციფრული ტაიმერი და LED ეკრანი წმენდის დროის ზუსტი კონტროლისთვის." }
    ]
  },
  {
    id: 72,
    slug: "zojirushi-ey-sb60-dish-dryer",
    name: "Zojirushi EY-SB60 ინსტრუმენტების საშრობი",
    img: "/images/catalog/zojirushi-ey-sb60-dish-dryer.png",
    cat: "სტერილიზაცია",
    brand: "Zojirushi",
    description: "დიდი მოცულობის countertop საშრობი კარადა კლინიკური აქსესუარების, თრეების და ინსტრუმენტების გაშრობისთვის წინასწარი წმენდისა და სტერილიზაციის workflow-ში.",
    specs: [
      "მოდელი: EY-SB60-XH",
      "ტიპი: countertop საშრობი / drying rack",
      "სიმძლავრე: 330W",
      "კვება: 100V, იაპონური სტანდარტი",
      "ფერი: Stainless Gray",
      "მასალა: Stainless Steel / Steel",
      "გარე ზომა: დაახლოებით 52 x 41.5 x 41 სმ",
      "წონა: დაახლოებით 6.0 კგ",
      "გაშრობის ტემპერატურა: 80°C ცხელი ჰაერი",
      "Ag+ ანტიბაქტერიული წყლის მიმღები, 80 სმ დრენაჟის შლანგი და ჩხირების/ინსტრუმენტების დამჭერის მიმღები",
      "ანტიბაქტერიული ფილტრი სუფთა ჰაერის მიწოდებისთვის",
      "დაშლადი და გასარეცხი ნაწილები: უჯრა, კალათა, დამჭერი, წყლის მიმღები და თავსახური"
    ],
    aiFeatures: [
      { icon: "zap", title: "80°C Drying", desc: "ცხელი ჰაერით გაშრობა ეხმარება ინსტრუმენტებისა და აქსესუარების სწრაფად გამშრალ მდგომარეობაში მოყვანას." },
      { icon: "shield", title: "Ag+ Hygiene", desc: "Ag+ ანტიბაქტერიული ელემენტები და ფილტრი ამცირებს წყლისა და ნარჩენი ტენიანობის ჰიგიენურ რისკებს." },
      { icon: "check", title: "Large Capacity", desc: "ფართო გახსნა და ღრმა კალათა მოსახერხებელია თრეების, მცირე კონტეინერებისა და მრავალჯერადი აქსესუარებისთვის." }
    ]
  },
  {
    id: 73,
    slug: "edpo-5-01-sterilization-container",
    name: "ЕДПО-5-01 სასტერილიზაციო კონტეინერი 5L",
    img: "/images/catalog/edpo-5-01-sterilization-container.jpg",
    cat: "სტერილიზაცია",
    brand: "Еламед",
    description: "5 ლიტრიანი პოლიმერული კონტეინერი სამედიცინო ინსტრუმენტების დეზინფექციისა და წინასტერილიზაციო დამუშავებისთვის, თავსახურით, პერფორირებული კალათით და დამჭერი ფირფიტით.",
    specs: [
      "მოდელი: ЕДПО-5-01",
      "დანიშნულება: დეზინფექცია და წინასტერილიზაციო დამუშავება",
      "სასარგებლო მოცულობა: 5 ლიტრი",
      "სრული მოცულობა: 7.5 ± 0.375 ლიტრი",
      "გარე ზომა: 394 x 260 x 156 mm",
      "წონა: არაუმეტეს 1.9 ± 0.95 kg",
      "პერფორირებული კალათის შიდა ზომა: 255 x 200 x 125 mm",
      "კალათის შიდა დიაგონალი: 375 mm",
      "კომპლექტაცია: კორპუსი, პერფორირებული კალათა, დამჭერი ფირფიტა და თავსახური",
      "მწარმოებელი ქვეყანა: რუსეთი",
      "გარანტია: 18 თვე წარმოების დღიდან"
    ],
    aiFeatures: [
      { icon: "shield", title: "Pre-sterilization", desc: "გამოიყენება ინსტრუმენტების დეზინფექციისა და წინასტერილიზაციო დამუშავების ეტაპზე." },
      { icon: "check", title: "Full Immersion", desc: "დამჭერი ფირფიტა ხელს უწყობს ინსტრუმენტების სრულ ჩაძირვას დეზინფექციურ ხსნარში." },
      { icon: "zap", title: "Safe Handling", desc: "პერფორირებული კალათა ამცირებს ხსნართან ხელით კონტაქტს და ამარტივებს ხსნარის ჩამოწურვას." }
    ]
  },
  {
    id: 74,
    slug: "wisedent-br-164ap",
    name: "Wisedent BR-164AP LED მაღალსიჩქარიანი ბუნიკი",
    img: "/images/baru-br-164ap.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-164AP არის მაღალსიჩქარიანი LED ჰაერის ტურბინული სტომატოლოგიური ბუნიკი push-button ჩაკით და 2/4 ხვრელის არჩევანით.",
    specs: [
      "მოდელი: BR-164AP",
      "High speed LED air turbine handpiece",
      "2/4 holes for selection",
      "Push button chuck",
      "Air pressure: 0.22-0.3 MPa",
      "Bur size: 1.595-1.6 mm",
      "Luminous intensity: >1500 LUX",
      "Warranty: 3 months"
    ],
    aiFeatures: [
      { icon: "zap", title: "LED Light", desc: "ჩაშენებული LED განათება სამუშაო ველის უკეთესი ხედვისთვის." },
      { icon: "check", title: "Push Button", desc: "Push-button chuck ამარტივებს ბორის სწრაფ და კომფორტულ შეცვლას." },
      { icon: "shield", title: "2/4 Holes", desc: "ხელმისაწვდომია 2 ან 4 ხვრელიანი შეერთების არჩევანით." }
    ]
  },
  {
    id: 75,
    slug: "wisedent-j-type-contra-angle",
    name: "Wisedent J-Type დაბალსიჩქარიანი contra angle",
    img: "/images/baru-low-speed-j-type.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "Internal water spray დაბალსიჩქარიანი სტომატოლოგიური contra angle J-type push-button სისტემით, ყოველდღიური პრეპარირებისა და პოლირების სამუშაოებისთვის.",
    specs: [
      "ტიპი: Low speed contra angle handpiece",
      "J-type push-button contra angle",
      "Internal water spray",
      "გამოყენება: cavity preparation და tooth polishing",
      "კატეგორია: Dental Handpiece / Low Speed Handpiece",
      "OEM / ODM ხელმისაწვდომია მწარმოებლის გვერდზე"
    ],
    aiFeatures: [
      { icon: "zap", title: "Internal Spray", desc: "შიდა წყლის სპრეი ხელს უწყობს გაგრილებას და სამუშაო კომფორტს." },
      { icon: "check", title: "Push Button", desc: "J-type push-button სისტემა ამარტივებს ბორის შეცვლას." },
      { icon: "shield", title: "Low Speed", desc: "დაბალსიჩქარიანი contra angle ყოველდღიური კლინიკური მანიპულაციებისთვის." }
    ]
  },
  {
    id: 76,
    slug: "wisedent-br-412k-implant",
    name: "Wisedent BR-412K 20:1 implant contra angle",
    img: "/images/baru-br-412k-implant.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-412K არის 20:1 იმპლანტოლოგიური contra angle handpiece, NSK ტიპის მოდელი Dental Handpiece და Dental Equipment სამუშაოებისთვის.",
    specs: [
      "მოდელი: BR-412K",
      "ტიპი: Implant handpiece / contra angle",
      "გადაცემა: 20:1",
      "NSK type implant handpiece",
      "კატეგორია: Dental Handpiece / Low Speed Handpiece",
      "გამოყენება: იმპლანტოლოგიური და ქირურგიული სამუშაოები",
      "OEM / ODM ხელმისაწვდომია მწარმოებლის გვერდზე"
    ],
    aiFeatures: [
      { icon: "shield", title: "20:1 Reduction", desc: "20:1 გადაცემა განკუთვნილია კონტროლირებადი იმპლანტოლოგიური სამუშაოებისთვის." },
      { icon: "check", title: "NSK Type", desc: "NSK ტიპის ფორმატი თავსებადობისა და ყოველდღიური გამოყენებისთვის." },
      { icon: "zap", title: "Implant Workflow", desc: "დაბალსიჩქარიანი contra angle ქირურგიული და იმპლანტოლოგიური პროცედურებისთვის." }
    ]
  },
  {
    id: 77,
    slug: "wisedent-br-422q-41a-ipr",
    name: "Wisedent BR-422Q-41A 4:1 IPR handpiece kit",
    img: "/images/baru-br-422q-41a-ipr.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-422Q-41A არის 4:1 orthodontic saw blade handpiece kit IPR პროცედურებისთვის, reciprocating interproximal stripping სისტემით.",
    specs: [
      "მოდელი: BR-422Q-41A",
      "ტიპი: Orthodontic saw blade dental handpiece kit",
      "გადაცემა: 4:1",
      "IPR reciprocating interproximal stripping system",
      "Reciprocating blade movement",
      "თავსებადია standard orthodontic saw blades-თან",
      "გამოყენება: orthodontic space creation და crowding correction"
    ],
    aiFeatures: [
      { icon: "shield", title: "Controlled IPR", desc: "4:1 გადაცემა და reciprocating მოძრაობა ეხმარება კონტროლირებულ enamel reduction-ს." },
      { icon: "zap", title: "Reciprocating", desc: "ხერხის პირის reciprocating მოძრაობა შექმნილია interproximal stripping სამუშაოებისთვის." },
      { icon: "check", title: "Ortho Kit", desc: "IPR გადაწყვეტა ორთოდონტიული სივრცის შექმნისა და crowding correction-ისთვის." }
    ]
  },
  {
    id: 78,
    slug: "wisedent-low-speed-contra-angle",
    name: "Wisedent Low Speed Contra Angle",
    img: "/images/baru-low-speed-contra-angle.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "Wisedent Low Speed Contra Angle არის დაბალსიჩქარიანი კუთხიანი handpiece კომპონენტი ყოველდღიური პრეპარირების, finishing და polishing სამუშაოებისთვის.",
    specs: [
      "ტიპი: Low speed contra angle",
      "კომპონენტი: Low Speed Dental Handpiece Set",
      "კატეგორია: Dental Handpiece",
      "გამოყენება: cavity preparation, finishing და polishing",
      "თავსებადია air motor სისტემასთან",
      "OEM / ODM ხელმისაწვდომია მწარმოებლის გვერდზე"
    ],
    aiFeatures: [
      { icon: "check", title: "Contra Angle", desc: "კუთხიანი ფორმა ეხმარება რთულად მისადგომ ზონებში მუშაობას." },
      { icon: "shield", title: "Low Speed", desc: "დაბალსიჩქარიანი კონტროლი ყოველდღიური კლინიკური მანიპულაციებისთვის." },
      { icon: "zap", title: "Set Component", desc: "გამოიყენება air motor-სა და straight handpiece-თან ერთ სამუშაო სისტემაში." }
    ]
  },
  {
    id: 79,
    slug: "wisedent-low-speed-air-motor",
    name: "Wisedent Low Speed Air Motor",
    img: "/images/baru-low-speed-air-motor.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "Wisedent Low Speed Air Motor არის handpiece set-ის მამოძრავებელი ნაწილი, რომელიც ამუშავებს contra angle-ს და straight handpiece-ს.",
    specs: [
      "ტიპი: Low speed air motor",
      "კომპონენტი: Air motor",
      "კატეგორია: Dental Handpiece",
      "გამოყენება: low speed handpiece drive",
      "გამოიყენება contra angle და straight handpiece კომპონენტებთან",
      "OEM / ODM ხელმისაწვდომია მწარმოებლის გვერდზე"
    ],
    aiFeatures: [
      { icon: "zap", title: "Drive Unit", desc: "Air motor უზრუნველყოფს დაბალსიჩქარიანი handpiece კომპონენტების მუშაობას." },
      { icon: "check", title: "Set Compatible", desc: "შეესაბამება იმავე set-ის contra angle და straight handpiece ნაწილებს." },
      { icon: "shield", title: "Daily Workflow", desc: "გამოსადეგია კლინიკის ყოველდღიური finishing და polishing პროცესებისთვის." }
    ]
  },
  {
    id: 80,
    slug: "wisedent-low-speed-straight-handpiece",
    name: "Wisedent Low Speed Straight Handpiece",
    img: "/images/baru-low-speed-straight-handpiece.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "Wisedent Low Speed Straight Handpiece არის პირდაპირი დაბალსიჩქარიანი handpiece კომპონენტი ლაბორატორიული და კლინიკური finishing/polishing სამუშაოებისთვის.",
    specs: [
      "ტიპი: Low speed straight handpiece",
      "კომპონენტი: Straight handpiece",
      "კატეგორია: Dental Handpiece",
      "გამოყენება: finishing, polishing და ლაბორატორიული სამუშაოები",
      "თავსებადია air motor სისტემასთან",
      "OEM / ODM ხელმისაწვდომია მწარმოებლის გვერდზე"
    ],
    aiFeatures: [
      { icon: "check", title: "Straight Handpiece", desc: "პირდაპირი ფორმა მოსახერხებელია polishing და finishing სამუშაოებისთვის." },
      { icon: "zap", title: "Low Speed Control", desc: "დაბალსიჩქარიანი მუშაობა ხელს უწყობს სტაბილურ მანიპულაციას." },
      { icon: "shield", title: "Set Component", desc: "გამოიყენება იმავე low speed dental handpiece set-ის air motor-თან ერთად." }
    ]
  },
  {
    id: 81,
    slug: "wisedent-br-422ss-15",
    name: "Wisedent BR-422SS-15 1:5 contra angle",
    img: "/images/baru-br-422ss-15.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-422SS-15 არის 1:5 increasing speed stainless steel contra angle handpiece push-button სისტემით, მაღალი ხარისხის სტომატოლოგიური პრეპარირების სამუშაოებისთვის.",
    specs: [
      "მოდელი: BR-422SS-15",
      "ტიპი: Increasing speed contra angle handpiece",
      "გადაცემა: 1:5",
      "მასალა: Stainless steel",
      "Push-button chuck",
      "კატეგორია: Dental Handpiece / Contra Angle",
      "გამოყენება: high speed preparation და restorative workflow"
    ],
    aiFeatures: [
      { icon: "zap", title: "1:5 Increasing", desc: "1:5 გადაცემა ზრდის ბრუნვის სიჩქარეს პრეპარირების სამუშაოებისთვის." },
      { icon: "check", title: "Push Button", desc: "Push-button სისტემა ამარტივებს ბორის სწრაფ შეცვლას." },
      { icon: "shield", title: "Steel Body", desc: "Stainless steel კორპუსი გამძლე ყოველდღიური კლინიკური გამოყენებისთვის." }
    ]
  },
  {
    id: 82,
    slug: "wisedent-br-103-gutta-cutter",
    name: "Wisedent BR-103 Wireless Gutta Cutter",
    img: "/images/baru-br-103-gutta-cutter.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-103 არის უკაბელო gutta percha cutter ენდოდონტიური obturation სამუშაოებისთვის, detachable battery-ით და reusable needle სისტემით.",
    specs: [
      "მოდელი: BR-103",
      "ტიპი: Wireless gutta percha cutter",
      "მაქსიმალური ტემპერატურა: 280°C",
      "სწრაფი გაცხელება",
      "ელემენტი: 2 ცალი AA 1.5V battery",
      "Detachable battery",
      "Reusable needle",
      "გამოყენება: endodontic obturation / gutta percha cutting"
    ],
    aiFeatures: [
      { icon: "zap", title: "Fast Heating", desc: "სწრაფი გაცხელება ამარტივებს gutta percha-ს მოჭრას obturation პროცესში." },
      { icon: "check", title: "Reusable Needle", desc: "Reusable needle სისტემა პრაქტიკულია ყოველდღიური ენდოდონტიური სამუშაოებისთვის." },
      { icon: "shield", title: "Wireless Design", desc: "უკაბელო ფორმატი და detachable battery ზრდის გამოყენების კომფორტს." }
    ]
  },
  {
    id: 83,
    slug: "wisedent-br-412t-1-prosthetic-kit",
    name: "Wisedent BR-412T-1 Implant Prosthetic Kit",
    img: "/images/baru-br-412t-1-prosthetic-kit.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-412T-1 არის უნივერსალური implant prosthetic repair kit torque wrench-ით და hand driver-ებით, იმპლანტის აბატმენტებისა და პროთეზირების სამუშაოებისთვის.",
    specs: [
      "მოდელი: BR-412T-1",
      "ტიპი: Implant prosthetic / repair torque wrench kit",
      "კომპლექტაცია: 16 PCS kit",
      "Universal implant wrench და hand drivers",
      "თავსებადობის ნიშნები: Ankylos, Anthogyr, Osstem, Cortex, Dentium, ICX, Nobel, Straumann",
      "Hex ზომები: 1.0, 1.19, 1.20, 1.25, 1.27, 1.40",
      "გამოყენება: implant prosthetic repair, abutment screw tightening და surgical/prosthetic workflow"
    ],
    aiFeatures: [
      { icon: "check", title: "Universal Kit", desc: "კომპლექტში თავმოყრილია სხვადასხვა implant სისტემასთან თავსებადი driver-ები." },
      { icon: "shield", title: "Torque Wrench", desc: "Torque wrench ეხმარება აბატმენტის ხრახნების კონტროლირებულ დაჭერას." },
      { icon: "zap", title: "16 PCS", desc: "16 ნაწილიანი კომპლექტი მოსახერხებელია იმპლანტის პროთეზირების სამუშაოებისთვის." }
    ]
  },
  {
    id: 84,
    slug: "wisedent-br-412k-ed-implant",
    name: "Wisedent BR-412K-ED 20:1 LED Implant Contra Angle",
    img: "/images/baru-br-412k-ed-implant.jpg",
    cat: "სხვა პარტნიორი ბრენდები",
    brand: "Wisedent / Baru",
    description: "BR-412K-ED არის detachable implant LED / fiber optic 20:1 contra angle handpiece იმპლანტოლოგიური და ქირურგიული სამუშაოებისთვის.",
    specs: [
      "მოდელი: BR-412K-ED",
      "ტიპი: Implant LED / fiber optic contra angle handpiece",
      "გადაცემა: 20:1",
      "Detachable design",
      "LED / fiber optic განათების მხარდაჭერა",
      "კატეგორია: Dental Handpiece / Implant Handpiece",
      "გამოყენება: implant surgery და surgical workflow"
    ],
    aiFeatures: [
      { icon: "shield", title: "20:1 Reduction", desc: "20:1 გადაცემა განკუთვნილია კონტროლირებადი იმპლანტოლოგიური სამუშაოებისთვის." },
      { icon: "zap", title: "LED / Fiber Optic", desc: "განათების მხარდაჭერა აუმჯობესებს სამუშაო ველის ხედვას ქირურგიულ პროცესში." },
      { icon: "check", title: "Detachable", desc: "დაშლადი დიზაინი პრაქტიკულია მოვლისა და ყოველდღიური გამოყენებისთვის." }
    ]
  },
  {
    id: 85,
    slug: "sidelab-p1",
    name: "SideLab P1 სავარძელთან 3D პრინტერი",
    img: "/images/sidelab-p1.webp",
    images: [
      "/images/sidelab-p1.webp",
      "/images/blog/sidelab-p1/sidelab-p1-hero.webp",
      "/images/blog/sidelab-p1/sidelab-p1-capsule-pps.webp",
      "/images/blog/sidelab-p1/sidelab-p1-engineered.webp"
    ],
    cat: "ციფრული სკანერები",
    brand: "Eighteeth",
    description: "SideLab P1 არის Eighteeth-ის სავარძელთან ბეჭდვის ჰიბრიდული 3D პრინტერი ჩაშენებული გამყარების კამერით. კაფსულური რეჟიმი გვირგვინის, ინლეისა და ონლეის სწრაფ ბეჭდვას ემსახურება, ხოლო პლატფორმული რეჟიმი სრული რკალის მოდელებს, ხიდებს და სხვა სტომატოლოგიურ ნამუშევრებს. Helios სკანერთან და AI დიზაინთან ერთად ერთვიზიტიანი რესტავრაციის ციფრულ სამუშაო პროცესს ქმნის.",
    specs: [
      "ბეჭდვის ტექნოლოგია: 9K LCD, Press Pneumatic Stereolithography (PPS)",
      "ორი რეჟიმი: კაფსულური და პლატფორმული",
      "ერთი გვირგვინის ბეჭდვა: 8–10 წთ; ბეჭდვის სიზუსტე: 30 მკმ",
      "ჩაშენებული გამყარების კამერა (გამყარება ~3 წთ)",
      "ერთი კერამიკული კაფსულა: 5 გვირგვინამდე; სიმტკიცე: 200 MPa",
      "5 ბუნებრივი ელფერი: BL1, A1, A2, A3, B1",
      "სამუშაო მოცულობა: 80 × 70 × 80 მმ; ფენის სისქე: 0.01–0.10 მმ",
      "პიქსელის ზომა: 14 × 19 მკმ; ტალღის სიგრძე: 385 / 405 ნმ",
      "ზომა: 200 × 170 × 249 მმ; წონა: 4.86 კგ",
      "3.97\" სენსორული ეკრანი; USB / Wi-Fi; კალიბრაციის გარეშე",
      "კვება: 100–240V, 50/60Hz; სიმძლავრე: 120W"
    ],
    aiFeatures: [
      { icon: "zap", title: "~20 წთ რესტავრაცია", desc: "სკანირება, AI დიზაინი, ბეჭდვა და გამყარება ერთ ვიზიტში, დაახლოებით 20 წუთში." },
      { icon: "brain", title: "AI Crown", desc: "AI-დახმარებით გვირგვინის დიზაინი Helios ინტრაორალური სკანერის მონაცემებიდან." },
      { icon: "check", title: "კაფსულური სისტემა", desc: "ფისის ხელით ჩასხმის გარეშე, სუფთა და სწრაფი მასალის ჩანაცვლება." },
      { icon: "shield", title: "2-in-1", desc: "ბეჭდვა და გამყარება ერთ კომპაქტურ მოწყობილობაში." }
    ]
  }
];
