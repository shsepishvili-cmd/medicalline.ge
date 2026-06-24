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
    description: "CBCT ტომოგრაფი. 3-ერთში სისტემა.", 
    specs: ["FOV: 16x10 სმ", "Canon რენტგენის მილი", "AI რეკონსტრუქცია"], 
    aiFeatures: [{ icon: 'brain', title: 'Smart MAR', desc: 'მეტალის არტეფაქტების AI გასუფთავება.' }] 
  },
  { 
    id: 36, 
    slug: "helios-700",
    name: "Helios 700 უკაბელო სკანერი", 
    img: "/images/helios700.png", 
    cat: "ციფრული სკანერები", 
    description: "უსადენო ინტრაორალური სკანერი Wi-Fi 6-ით.", 
    specs: ["სიზუსტე: 16μm", "წონა: 245გ"], 
    aiFeatures: [{ icon: 'brain', title: 'AI Filter', desc: 'აშორებს ენას და ლოყას სკანირებისას.' }] 
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
    cat: "სხვა", 
    description: "პოლიმერიზაციის ნათურა კარიეს-დეტექტორით.", 
    specs: ["3000 mW/cm²", "კარიეს დეტექტორი"] 
  },
  { 
    id: 50, 
    slug: "curingpen",
    name: "CuringPen პოლიმერიზატორი", 
    img: "/images/curingpen.jpg", 
    cat: "სხვა", 
    description: "კლასიკური უსადენო ნათურა.", 
    specs: ["Broadband LED", "4 რეჟიმი"] 
  },
  { 
    id: 51, 
    slug: "curingpen-e",
    name: "CuringPen-E პოლიმერიზატორი", 
    img: "/images/curinpene.png", 
    cat: "სხვა", 
    description: "ეკონომიური და მსუბუქი ნათურა.", 
    specs: ["სწრაფი დამუხტვა", "მარტივი მართვა"] 
  },
  { 
    id: 52, 
    slug: "softouch",
    name: "SofTouch განათება კაბელით", 
    img: "/images/softouch.jpg", 
    cat: "სხვა", 
    description: "ბინოკულარის განათება კაბელით.", 
    specs: ["რეგულირებადი სიმძლავრე", "ძლიერი აკუმულატორი"] 
  },
  { 
    id: 53, 
    slug: "e-sanit",
    name: "E-Sanit B კლასის ავტოკლავი", 
    img: "/images/esanit.png", 
    cat: "ჰიგიენა", 
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
    img: "/images/autoclave_main.jpg",
    cat: "ჰიგიენა",
    description: "კომპაქტური მაღალი წნევის ორთქლის სტერილიზატორი სწრაფი სტერილიზაციისთვის.",
    specs: [
      "5L მოცულობა",
      "უსწრაფესი რეჟიმი: 10 წუთი",
      "Touch Screen, პრინტერი და SD Card",
      "7 სტერილიზაციის რეჟიმი და 20 პროგრამა",
      "მაქსიმალური ტემპერატურა: 137℃",
      "მაქსიმალური წნევა: 0.24 MPa"
    ]
  }
];
