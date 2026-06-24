export const products = [
  { 
    id: 1, 
    slug: "findpex",
    name: "FindPex აპექს ლოკატორი", 
    img: "/images/findpex.png", 
    cat: "ენდოდონტია", 
    description: "ახალი თაობის პლანშეტური აპექს ლოკატორი. იყენებს მრავალსიხშირიან ალგორითმს მაქსიმალური სიზუსტისთვის.", 
    specs: ["5.1\" ფერადი სენსორული LCD ეკრანი", "მრავალსიხშირიანი ტექნოლოგია", "რეალურ დროში ვიზუალიზაცია"],
    aiFeatures: [{ icon: 'brain', title: 'AI Algorithm', desc: 'ფილტრავს სისხლსა და ნერწყვს სიზუსტისთვის.' }]
  },
  { 
    id: 2, 
    slug: "e-pex",
    name: "E-PEX აპექს ლოკატორი", 
    img: "/images/epex.png", 
    cat: "ენდოდონტია", 
    description: "პროფესიონალური აპექს ლოკატორი, რომელიც სინქრონიზდება E-CONNECT S მოდელთან.", 
    specs: ["ინტეგრირებადი სისტემა", "ხმოვანი სიგნალიზაცია", "მაღალი კონტრასტული ეკრანი"] 
  },
  { 
    id: 3, 
    slug: "airpex",
    name: "AirPex აპექს ლოკატორი", 
    img: "/images/airpex.jpg", 
    cat: "ენდოდონტია", 
    description: "მსოფლიოში ყველაზე მინიატურული უსადენო აპექს ლოკატორი.", 
    specs: ["წონა: 15გ", "უსადენო დამუხტვა", "LED ინდიკაცია"],
    aiFeatures: [{ icon: 'zap', title: 'Wireless AI', desc: '98% სიზუსტე სრულად უსადენო კორპუსში.' }]
  },
  { 
    id: 4, 
    slug: "e-connect-s-plus",
    name: "E-Connect S+ ენდომოტორი", 
    img: "/images/econnectsplus.png", 
    cat: "ენდოდონტია", 
    description: "Brushless ენდო-მოტორი ინტეგრირებული აპექს ლოკატორით.", 
    specs: ["სიჩქარე: 100-1500 RPM", "ტორკი: 0.4-5.0 N.cm"], 
    aiFeatures: [{ icon: 'shield', title: 'Auto Stop', desc: 'ავტომატური გაჩერება აპექსის მიღწევისას.' }] 
  },
  { 
    id: 5, 
    slug: "e-connect-s",
    name: "E-Connect S ენდომოტორი", 
    img: "/images/econnects.png", 
    cat: "ენდოდონტია", 
    description: "ენდო-მოტორი აპექს ლოკატორით სრული კონტროლისთვის.", 
    specs: ["OLED ეკრანი", "Apical Action ფუნქციები"] 
  },
  { 
    id: 6, 
    slug: "e-connect",
    name: "E-CONNECT ენდომოტორი", 
    img: "/images/econnect.png", 
    cat: "ენდოდონტია", 
    description: "საიმედო და ეკონომიური უსადენო ენდო-მოტორი.", 
    specs: ["10 მეხსიერების პროგრამა", "გრძელვადიანი აკუმულატორი"] 
  },
  { 
    id: 7, 
    slug: "e-xtreme",
    name: "E-xtreme ენდომოტორი", 
    img: "/images/extreme.png", 
    cat: "ენდოდონტია", 
    description: "ულტრა-მსუბუქი მოტორი (99გ).", 
    specs: ["360° მბრუნავი თავაკი", "წონა: 99გ"] 
  },
  { 
    id: 8, 
    slug: "e-value-e",
    name: "E-Value E ენდომოტორი", 
    img: "/images/evaluee.png", 
    cat: "ენდოდონტია", 
    description: "Adaptive Torque ტექნოლოგია.", 
    specs: ["Adaptive Torque Control", "მინიატურული თავაკი"] 
  },
  { 
    id: 9, 
    slug: "e-value",
    name: "E-Value ენდომოტორი", 
    img: "/images/evalue.png", 
    cat: "ენდოდონტია", 
    description: "კომპაქტური უსადენო ენდო-მოტორი.", 
    specs: ["ავტომატური Stop/Reverse", "ერგონომიული ფორმა"] 
  },
  { 
    id: 10, 
    slug: "e-flex-gold",
    name: "E-FLEX GOLD ენდოფაილი", 
    img: "/images/eflexgold.png", 
    cat: "ენდოდონტია", 
    description: "Gold Heat Treatment NiTi ფაილები.", 
    specs: ["მაღალი ჭრის უნარი", "არხის ანატომიის შენარჩუნება"] 
  },
  { 
    id: 11, 
    slug: "e-flex-blue",
    name: "E-FLEX BLUE ენდოფაილი", 
    img: "/images/eflexblue.png", 
    cat: "ენდოდონტია", 
    description: "Controlled Memory NiTi ფაილები.", 
    specs: ["მაქსიმალური მოქნილობა", "ლურჯი თერმული დამუშავება"] 
  },
  { 
    id: 12, 
    slug: "e-flex-s",
    name: "E-FLEX S ენდოფაილი", 
    img: "/images/eflexs.png", 
    cat: "ენდოდონტია", 
    description: "უნივერსალური NiTi ფაილების სისტემა.", 
    specs: ["სტანდარტული NiTi შენადნობი", "ეფექტური ევაკუაცია"] 
  },
  { 
    id: 13, 
    slug: "e-flex-rec",
    name: "E-FLEX REC ენდოფაილი", 
    img: "/images/eflexrec.png", 
    cat: "ენდოდონტია", 
    description: "რეკიპროკული NiTi ფაილები.", 
    specs: ["Reciprocating მოძრაობა", "მაღალი უსაფრთხოება"] 
  },
  { 
    id: 14, 
    slug: "e-flex-one",
    name: "E-FLEX ONE ენდოფაილი", 
    img: "/images/eflexone.png", 
    cat: "ენდოდონტია", 
    description: "Single-file სისტემა M-Wire ტექნოლოგიით.", 
    specs: ["M-Wire ტექნოლოგია", "ერთფაილიანი სისტემა"] 
  },
  { 
    id: 15, 
    slug: "e-flex-mini",
    name: "E-FLEX MINI ენდოფაილი", 
    img: "/images/eflexmini.png", 
    cat: "ენდოდონტია", 
    description: "მოკლე NiTi ფაილები რთული წვდომისთვის.", 
    specs: ["მოკლე სახელური", "იდეალურია მოლარებისთვის"] 
  },
  { 
    id: 16, 
    slug: "e-flex-rt",
    name: "E-FLEX RT ენდოფაილი", 
    img: "/images/eflexrt.png", 
    cat: "ენდოდონტია", 
    description: "Retreatment ფაილების ნაკრები.", 
    specs: ["3 ფაილიანი სისტემა", "ეფექტური ევაკუაცია"] 
  },
  { 
    id: 17, 
    slug: "e-flex-path",
    name: "E-FLEX PATH ენდოფაილი", 
    img: "/images/eflexpath.png", 
    cat: "ენდოდონტია", 
    description: "გლიდ პათის (Glide Path) ფაილები.", 
    specs: ["მოქნილი წვერო", "სწრაფი გავლა"] 
  },
  { 
    id: 18, 
    slug: "e-style-gold-blue",
    name: "E-STYLE GOLD & BLUE ენდოფაილი", 
    img: "/images/estyle.png", 
    cat: "ენდოდონტია", 
    description: "როტაციული ფაილების პრემიუმ სერია.", 
    specs: ["მაღალი ჭრის ეფექტურობა", "პროფესიონალური ხარისხი"] 
  },
  { 
    id: 19, 
    slug: "hand-files",
    name: "Hand Files ენდოფაილი", 
    img: "/images/handsfiles.png", 
    cat: "ენდოდონტია", 
    description: "უჟანგავი ფოლადის ხელის ფაილები.", 
    specs: ["ISO სტანდარტი", "ერგონომიული სახელური"] 
  },
  { 
    id: 20, 
    slug: "space-pack-space-fill",
    name: "Space-Pack & Space-Fill საობტურაციო სისტემა", 
    img: "/images/spacepack.jpg", 
    cat: "ენდოდონტია", 
    description: "3D ობტურაციის სრული სისტემა.", 
    specs: ["Downpack და Backfill", "ტემპერატურის ზუსტი კონტროლი"] 
  },
  { 
    id: 21, 
    slug: "fast-pack-pro",
    name: "Fast-Pack Pro საობტურაციო ბუნიკი", 
    img: "/images/fastpackpro.png", 
    cat: "ენდოდონტია", 
    description: "პროფესიონალური Downpack აპარატი.", 
    specs: ["0.2წმ 200°C-მდე", "360° მბრუნავი პლაგერი"] 
  },
  { 
    id: 22, 
    slug: "fast-fill",
    name: "Fast-Fill საობტურაციო შემავსებელი", 
    img: "/images/fastfill.png", 
    cat: "ენდოდონტია", 
    description: "გუტაპერჩას ინჟექტორი შემავსებელი.", 
    specs: ["ზუსტი დოზირება", "სწრაფი გაცხელება"] 
  },
  { 
    id: 23, 
    slug: "gutta-percha-points",
    name: "Gutta Percha Points-თხევადი გუტაპერჩა", 
    img: "/images/gutta.jpg", 
    cat: "ენდოდონტია", 
    description: "სტანდარტული გუტაპერჩას წკირები.", 
    specs: ["ზუსტი ზომები", "ბიოთავსებადი მასალა"] 
  },
  { 
    id: 24, 
    slug: "absorbent-paper-points",
    name: "Absorbent Paper Points", 
    img: "/images/absorber.jpg", 
    cat: "ენდოდონტია", 
    description: "ქაღალდის წკირები არხის გაშრობისთვის.", 
    specs: ["მაღალი შეწოვადობა", "სტერილიზებული"] 
  },
  { 
    id: 25, 
    slug: "ultramint-pro",
    name: "UltraMint / Pro პიეზო სკალერი", 
    img: "/images/ultramint.png", 
    cat: "ჰიგიენა", 
    description: "ულტრაბგერითი სკალერი.", 
    specs: ["სენსორული კონტროლი", "თვით-წმენდის რეჟიმი"] 
  },
  { 
    id: 26, 
    slug: "ultra-x",
    name: "Ultra X ულტრაბგერითი აქტივატორი", 
    img: "/images/ultrax.jpg", 
    cat: "ენდოდონტია", 
    description: "ულტრაბგერითი აქტივატორი ირიგაციისთვის.", 
    specs: ["45 kHz სიხშირე", "უსადენო მუშაობა"] 
  },
  {
    id: 27,
    slug: "e-flow",
    name: "E-FLOW საანესთეზიო აპარატი",
    img: "/images/eflow.png",
    cat: "ენდოდონტია",
    description: "საანესთეზიო ხსნარების უმტკივნეულო შეყვანა.",
    specs: ["ტემპერატურის კონტროლი", "სწრაფი გაცხელება"]
  },
  {
    id: 28,
    slug: "nanomotor",
    name: "Eighteeth Nanomotor ენდომოტორი",
    img: "/images/nanomotor1.png",
    cat: "ენდოდონტია",
    description: "3-ინ-1 მულტიფუნქციური ენდომოტორი: ენდოდონტია, ირიგაციის აქტივაცია და პოლირება — 100 გრამიან Brushless კორპუსში.",
    specs: [
      "სიჩქარე: 50–3000 ბრ/წთ",
      "რეჟიმები: Endo / Activation / Prophy",
      "ATC (Adaptive Torque Control)",
      "Super Mini თავი — 9.7 მმ სიმაღლე",
      "360° ბრუნვადი თავი",
      "USB Type-C დატენვა",
      "OLED დისპლეი",
      "წონა: 100 გ"
    ],
    aiFeatures: [
      { icon: 'zap', title: 'Brushless Motor', desc: 'ნულოვანი ვიბრაცია, 10× გაზრდილი რესურსი სტანდარტულ მოდელებთან შედარებით.' },
      { icon: 'shield', title: 'ATC რეჟიმი', desc: 'ავტომატური torque კონტროლი — გამორიცხავს ფაილის გადატეხვას.' }
    ]
  },
  {
    id: 69,
    slug: "aurora-endofiles",
    name: "Aurora ენდოფაილები",
    img: "/images/blog/aurora-endo-files/aurora-catalog-1.png",
    cat: "ენდოდონტია",
    description: "Aurora Series ენდოფაილები არის NiTi როტაციული ფაილების სისტემა არხის ფორმირებისა და დამუშავებისთვის. სერია მოიცავს Super Flexi, R-Shaper და Sup-Taper ფაილებს.",
    specs: [
      "Super Flexi Files მოქნილი არხებისთვის",
      "R-Shaper ფაილები shaping workflow-სთვის",
      "Sup-Taper Files პროგრესული ტეიპერით არხის ფორმირებისთვის",
      "Heat activated NiTi და nano coating",
      "25მმ სიგრძე; 6 ცალი შეფუთვაში"
    ],
    aiFeatures: [
      { icon: 'zap', title: 'Flexible NiTi', desc: 'თერმულად დამუშავებული NiTi ეხმარება მოხრილ არხებში უსაფრთხო მუშაობას.' },
      { icon: 'shield', title: 'System Workflow', desc: 'Super Flexi, R-Shaper და Sup-Taper ფაილები ფარავს glide path-ს, shaping-ს და taper finishing-ს.' }
    ]
  },

];