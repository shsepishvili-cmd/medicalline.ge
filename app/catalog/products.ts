export interface AiFeature {
  icon: string;
  title: string;
  desc: string;
}

export interface Product {
  id: number;
  name: string;
  img: string;
  cat: string;
  description: string;
  specs: string[];
  aiFeatures?: AiFeature[];
}

export const products: Product[] = [
    // --- APEX LOCATORS ---
    { 
      id: 1, name: "FindPex", img: "/images/findpex.png", cat: "ენდოდონტია", 
      description: "ახალი თაობის პლანშეტური აპექს ლოკატორი. იყენებს მრავალსიხშირიან ალგორითმს მაქსიმალური სიზუსტისთვის.", 
      specs: ["5.1\" ფერადი სენსორული LCD ეკრანი", "მრავალსიხშირიანი გაზომვის ტექნოლოგია", "რეალურ დროში ვიზუალიზაცია", "ავტომატური კალიბრაცია"],
      aiFeatures: [
         { icon: 'brain', title: 'Multi-Frequency', desc: 'ზუსტი გაზომვა სისხლსა და ნერწყვშიც კი.' },
         { icon: 'shield', title: 'Auto Calib', desc: 'თვით-კალიბრაცია ჩართვისთანავე.' },
         { icon: 'zap', title: 'Touch Screen', desc: 'ინტუიციური მართვა ერთი შეხებით.' }
      ]
    },
    { 
      id: 2, name: "E-PEX", img: "/images/epex.png", cat: "ენდოდონტია", 
      description: "პროფესიონალური აპექს ლოკატორი, რომელიც სინქრონიზდება E-CONNECT S მოდელთან.", 
      specs: ["ინტეგრირებადი სისტემა", "ხმოვანი სიგნალიზაცია", "მაღალი კონტრასტული ეკრანი", "კომპაქტური და ერგონომიული კორპუსი"] 
    },
    { 
      id: 3, name: "AirPex", img: "/images/airpex.jpg", cat: "ენდოდონტია", 
      description: "მსოფლიოში ყველაზე მინიატურული უსადენო აპექს ლოკატორი.", 
      specs: ["წონა: 15გ", "უსადენო დამუხტვა", "LED ინდიკაცია", "Bluetooth კავშირი სმარტფონთან"],
      aiFeatures: [
        { icon: 'zap', title: 'Wireless Charge', desc: 'მსოფლიოში პირველი აპექსი უსადენო დატენვით.' },
        { icon: 'brain', title: 'Miniature', desc: 'იწონის სულ რაღაც 15 გრამს (ბეჭდის ზომა).' },
        { icon: 'check', title: 'FPGA Chip', desc: 'უზრუნველყოფს 98% სიზუსტეს ნებისმიერ არხში.' }
      ]
    },

    // --- ENDO MOTORS ---
    { 
      id: 4, name: "E-Connect S+", img: "/images/econnectsplus.png", cat: "ენდოდონტია", 
      description: "Brushless ენდო-მოტორი ინტეგრირებული აპექს ლოკატორით.", 
      specs: ["სიჩქარე: 100 - 1500 RPM", "ტორკი: 0.4 - 5.0 N.cm", "340° მბრუნავი თავაკი", "9 პროგრამირებადი რეჟიმი"],
      aiFeatures: [
        { icon: 'brain', title: 'Smart Apex', desc: 'აპექსის მიღწევისას ძრავი ავტომატურად ჩერდება.' },
        { icon: 'zap', title: 'Brushless', desc: 'უხმაურო მუშაობა და 10-ჯერ გაზრდილი რესურსი.' },
        { icon: 'shield', title: 'Real-time', desc: 'ეკრანზე ხედავთ არხის სიღრმეს მუშაობის პროცესში.' }
      ]
    },
    { 
      id: 5, name: "E-Connect S", img: "/images/econnects.png", cat: "ენდოდონტია", 
      description: "ენდო-მოტორი აპექს ლოკატორით, რომელიც ექიმს აძლევს სრულ კონტროლს არხის დამუშავებისას.", 
      specs: ["OLED ეკრანი", "Apical Action ფუნქციები", "ავტომატური რევერსი", "თავსებადია ყველა NiTi სისტემასთან"] 
    },
    { 
      id: 6, name: "E-CONNECT", img: "/images/econnect.png", cat: "ენდოდონტია", 
      description: "საიმედო და ეკონომიური უსადენო ენდო-მოტორი.", 
      specs: ["კომფორტული Grip-ი", "გრძელვადიანი აკუმულატორი", "6 მეხსიერების პროგრამა", "მარტივი ინტერფეისი"] 
    },
    { 
      id: 7, name: "E-xtreme", img: "/images/extreme.png", cat: "ენდოდონტია", 
      description: "ულტრა-მსუბუქი მოტორი. ერგონომიული დიზაინი მაქსიმალურად ამცირებს ექიმის ხელის დაღლილობას.", 
      specs: ["წონა: 99გ", "360° მბრუნავი მინიატურული თავაკი", "ჩუმი მუშაობის რეჟიმი", "სიჩქარე: 100-1000 RPM"] 
    },
    { 
      id: 8, name: "E-Value E", img: "/images/evaluee.png", cat: "ენდოდონტია", 
      description: "უსადენო მოტორი Adaptive Torque ტექნოლოგიით.", 
      specs: ["Adaptive Torque Control", "მინიატურული თავაკი", "ხანგრძლივი მუშაობის რესურსი"] 
    },
    { 
      id: 9, name: "E-Value", img: "/images/evalue.png", cat: "ენდოდონტია", 
      description: "კომპაქტური და ეფექტური უსადენო ენდო-მოტორი საბაზისო ენდოდონტიური სამუშაოებისთვის.", 
      specs: ["ავტომატური Stop/Reverse", "ერგონომიული ფორმა", "ეკონომიური გადაწყვეტა"] 
    },

    // --- ENDO FILES ---
    { 
      id: 10, name: "E-FLEX GOLD", img: "/images/eflexgold.png", cat: "ენდოდონტია", 
      description: "თერმულად დამუშავებული NiTi ფაილები Gold Heat Treatment-ით.", 
      specs: ["ჯვარედინი კვეთა: სამკუთხა", "მაღალი ჭრის უნარი", "არხის ანატომიის შენარჩუნება", "Gold-Heat Heat Treatment"] 
    },
    { 
      id: 11, name: "E-FLEX BLUE", img: "/images/eflexblue.png", cat: "ენდოდონტია", 
      description: "Controlled Memory NiTi ფაილები. იდეალურია რთული და მოხრილი არხების უსაფრთხო პრეპარირებისთვის.", 
      specs: ["Controlled Memory ტექნოლოგია", "ლურჯი თერმული დამუშავება", "მაქსიმალური მოქნილობა"] 
    },
    { 
      id: 12, name: "E-FLEX S", img: "/images/eflexs.png", cat: "ენდოდონტია", 
      description: "უნივერსალური NiTi ფაილების სისტემა ეფექტური ჭრისა და გამძლეობის ბალანსით.", 
      specs: ["სტანდარტული NiTi შენადნობი", "ეფექტური ევაკუაცია", "მაღალი მდგრადობა"] 
    },
    { 
      id: 13, name: "E-FLEX REC", img: "/images/eflexrec.png", cat: "ენდოდონტია", 
      description: "რეკიპროკული NiTi ფაილები. საშუალებას აძლევს ექიმს დაამუშაოს არხი ერთი ინსტრუმენტით.", 
      specs: ["Reciprocating მოძრაობა", "მაღალი უსაფრთხოება", "მცირე დროის დანახარჯი"] 
    },
    { 
      id: 14, name: "E-FLEX ONE", img: "/images/eflexone.png", cat: "ენდოდონტია", 
      description: "Single-file სისტემა M-Wire ტექნოლოგიით. ზრდის ინსტრუმენტის გამძლეობას და მოქნილობას.", 
      specs: ["M-Wire ტექნოლოგია", "ერთფაილიანი სისტემა", "მაღალი ეფექტურობა"] 
    },
    { 
      id: 15, name: "E-FLEX MINI", img: "/images/eflexmini.png", cat: "ენდოდონტია", 
      description: "მოკლე NiTi ფაილები რთული წვდომის მქონე უბნებისთვის.", 
      specs: ["მოკლე სახელური", "მაღალი მოქნილობა", "იდეალურია მოლარებისთვის"] 
    },
    { 
      id: 16, name: "E-FLEX RT", img: "/images/eflexrt.png", cat: "ენდოდონტია", 
      description: "Retreatment ფაილების ნაკრები. შექმნილია ძველი გუტაპერჩასა და შემავსებელი მასალის სწრაფი მოცილებისთვის.", 
      specs: ["3 ფაილიანი სისტემა", "სპეციფიკური წვერო", "ეფექტური ევაკუაცია"] 
    },
    { 
      id: 17, name: "E-FLEX PATH", img: "/images/eflexpath.png", cat: "ენდოდონტია", 
      description: "გლიდ პათის (Glide Path) შესაქმნელი ფაილები. უზრუნველყოფს არხის უსაფრთხო და გლუვ გავლას.", 
      specs: ["მოქნილი წვერო", "არხის ფორმის შენარჩუნება", "სწრაფი გავლა"] 
    },
    { 
      id: 18, name: "E-STYLE GOLD & BLUE", img: "/images/estyle.png", cat: "ენდოდონტია", 
      description: "როტაციული ფაილების პრემიუმ სერია. ხელმისაწვდომია როგორც Gold, ისე Blue თერმული დამუშავებით.", 
      specs: ["მაღალი ჭრის ეფექტურობა", "ფართო ასორტიმენტი", "პროფესიონალური ხარისხი"] 
    },
    { 
      id: 19, name: "Hand Files", img: "/images/handsfiles.png", cat: "ენდოდონტია", 
      description: "უჟანგავი ფოლადის ხელის ფაილები (K, H, Reamers) მაქსიმალური ტაქტილური კონტროლისთვის.", 
      specs: ["უჟანგავი ფოლადი", "ერგონომიული სახელური", "ISO სტანდარტი"] 
    },

    // --- OBTURATION & CONSUMABLES ---
    { 
      id: 20, name: "Space-Pack & Space-Fill", img: "/images/spacepack.jpg", cat: "ენდოდონტია", 
      description: "3D ობტურაციის სრული სისტემა (Downpack + Backfill).", 
      specs: ["Downpack და Backfill ერთობაში", "ტემპერატურის ზუსტი კონტროლი", "ერგონომიული დიზაინი"] 
    },
    { 
      id: 21, name: "Fast-Pack Pro", img: "/images/fastpackpro.png", cat: "ენდოდონტია", 
      description: "პროფესიონალური Downpack აპარატი. წამიერი გაცხელება (0.2წმ).", 
      specs: ["0.2წმ 200°C-მდე", "360° მბრუნავი პლაგერი", "ავტომატური გათიშვა"] 
    },
    { 
      id: 22, name: "Fast-Fill", img: "/images/fastfill.png", cat: "ენდოდონტია", 
      description: "გუტაპერჩას ინჟექტორი Backfill ტექნოლოგიისთვის.", 
      specs: ["ზუსტი დოზირება", "სწრაფი გაცხელება", "მოსახერხებელი დიზაინი"] 
    },
    { 
      id: 23, name: "Gutta Percha Points", img: "/images/gutta.jpg", cat: "ენდოდონტია", 
      description: "სტანდარტული და კონუსური გუტაპერჩას წკირები.", 
      specs: ["ზუსტი ზომები", "ბიოთავსებადი მასალა", "მოქნილი და გამძლე"] 
    },
    { 
      id: 24, name: "Absorbent Paper Points", img: "/images/absorber.jpg", cat: "ენდოდონტია", 
      description: "ქაღალდის წკირები არხის იდეალური გაშრობისთვის.", 
      specs: ["მაღალი შეწოვადობა", "ფერადი კოდირება", "სტერილიზებული"] 
    },

    // --- ULTRASONIC & IRRIGATION ---
    { 
      id: 25, name: "UltraMint / UltraMint Pro", img: "/images/ultramint.png", cat: "ჰიგიენა", 
      description: "ულტრაბგერითი სკალერი. Pro ვერსია აღჭურვილია დამოუკიდებელი საირიგაციო ბოთლით.", 
      specs: ["სენსორული კონტროლი", "თვით-წმენდის რეჟიმი", "ფართო სპექტრის თავაკები", "ხაზოვანი ვიბრაცია"] 
    },
    { 
      id: 26, name: "Ultra X", img: "/images/ultrax.jpg", cat: "ენდოდონტია", 
      description: "ულტრაბგერითი აქტივატორი ირიგაციისთვის.", 
      specs: ["45 kHz სიხშირე", "ტიტანის მოქნილი თავაკები", "უსადენო მუშაობა"] 
    },
    { 
      id: 27, name: "E-FLOW", img: "/images/eflow.png", cat: "ენდოდონტია", 
      description: "საირიგაციო ხსნარების გამაცხელებელი სისტემა.", 
      specs: ["ტემპერატურის კონტროლი", "სწრაფი გაცხელება", "თავსებადია შპრიცებთან"] 
    },

    // --- X-RAY & IMAGING ---
    { 
      id: 28, name: "HyperLight", img: "/images/hyperlightm.png", cat: "რადიოლოგია", 
      description: "პორტატული რენტგენი მაღალი ხარისხის სურათებისთვის.", 
      specs: ["65kV / 2.5mA", "ფოკალური ლაქა: 0.4მმ", "მსუბუქი: 1.8კგ"],
      aiFeatures: [
        { icon: 'shield', title: 'Double Shield', desc: 'ტყვიის ორმაგი ფენა ექიმის დაცვისთვის.' },
        { icon: 'zap', title: 'Sharp Beam', desc: '0.4მმ ფოკუსი კრისტალური სურათისთვის.' },
        { icon: 'check', title: 'Portable', desc: 'მსუბუქი და მოსახერხებელი ნებისმიერ კაბინეტში.' }
      ]
    },
    { 
      id: 29, name: "HyperLight-G", img: "/images/hyperlightg.png", cat: "რადიოლოგია", 
      description: "Gun Type პორტატული რენტგენი. ერგონომიული დიზაინი ერთი ხელით გადაღებისთვის.", 
      specs: ["მოსახერხებელი Grip", "კრისტალური გამოსახულება", "მაღალი გამძლეობა"] 
    },
    { 
      id: 30, name: "HyperLight-M", img: "/images/hyperlightm.png", cat: "რადიოლოგია", 
      description: "ულტრა-კომპაქტური პორტატული რენტგენი.", 
      specs: ["მინიმალური დასხივება", "ინტუიციური ეკრანი", "სწრაფი მუშაობა"] 
    },
    { 
      id: 31, name: "NanoPix 1 / 2", img: "/images/nanopix1.png", cat: "რადიოლოგია", 
      description: "ციფრული RVG სენსორი. CSI ტექნოლოგია უზრუნველყოფს მაქსიმალურ დეტალიზაციას.", 
      specs: ["თეორიული რეზოლუცია: 25 lp/mm", "IP68 წყალგამძლეობა", "Nano-coating დაცვა"] 
    },
    { 
      id: 32, name: "NanoPix 1.5", img: "/images/nanopix1.5.png", cat: "რადიოლოგია", 
      description: "უნივერსალური ზომის სენსორი.", 
      specs: ["კომფორტული პაციენტისთვის", "მაღალი დინამიური დიაპაზონი", "ერგონომიული ფორმა"] 
    },
    { 
      id: 33, name: "NanoPix-E 1.3", img: "/images/nanopix1.3.png", cat: "რადიოლოგია", 
      description: "ეკონომიური სერიის ციფრული სენსორი.", 
      specs: ["მოსახერხებელი პროგრამული უზრუნველყოფა", "გამძლე კორპუსი", "ზუსტი დიაგნოსტიკა"] 
    },
    { 
      id: 35, name: "FinScan F350", img: "/images/finscan.png", cat: "რადიოლოგია", 
      description: "CBCT ტომოგრაფი. 3-ერთში სისტემა (CT, Pano, Ceph).", 
      specs: ["FOV: 16x10 სმ", "Canon რენტგენის მილი", "AI-ზე დაფუძნებული რეკონსტრუქცია"],
      aiFeatures: [
        { icon: "shield", title: "Low Dose", desc: "პაციენტის დასხივება შემცირებულია 40%-ით." },
        { icon: "brain", title: "Metal Artifact", desc: "მეტალის არტეფაქტების ავტომატური გასუფთავება (MAR)." },
        { icon: "zap", title: "Fast Recon", desc: "სურათის დამუშავება 15 წამზე ნაკლებ დროში." }
      ]
    },

    // --- DIGITAL IMPRESSIONS ---
    { 
      id: 36, name: "Helios 700", img: "/images/helios700.png", cat: "ციფრული სკანერები", 
      description: "უსადენო ინტრაორალური სკანერი. Wi-Fi 6 ტექნოლოგია.", 
      specs: ["სიზუსტე: 16μm", "AI-სკანირების ფუნქცია", "წონა: 245გ", "სრული თაღი < 30წმ"],
      aiFeatures: [
        { icon: "zap", title: "Speed Scan", desc: "მთლიანი ყბის სკანირება სულ რაღაც 30 წამში." },
        { icon: "brain", title: "AI Filtering", desc: "ავტომატურად ჭრის ენას და ლოყას სკანირებისას." },
        { icon: "check", title: "Cloud Share", desc: "გაუგზავნეთ ფაილი ლაბორატორიას 1 კლიკით." }
      ]
    },
    { 
      id: 37, name: "Helios 680", img: "/images/helios680.png", cat: "ციფრული სკანერები", 
      description: "ულტრა-მსუბუქი სადენიანი სკანერი.", 
      specs: ["წონა: 161გ", "AI ტექნოლოგია", "მაღალი სიჩქარე", "Compact Head"] 
    },
    { 
      id: 38, name: "Helios 600", img: "/images/helios600.png", cat: "ციფრული სკანერები", 
      description: "მაღალი წარმადობის სკანერი.", 
      specs: ["AI Cloud პლატფორმა", "რეალური ფერების ასახვა", "ავტომატური ნისლის საწინააღმდეგო"] 
    },
    { 
      id: 39, name: "Helios 500", img: "/images/helios500.png", cat: "ციფრული სკანერები", 
      description: "საიმედო და სწრაფი სკანერი ციფრული სტომატოლოგიის დასაწყებად.", 
      specs: ["საბაზისო AI ფუნქციები", "მარტივი ინტერფეისი", "მაღალი სიზუსტე"] 
    },

    // --- OPTICS ---
    { 
      id: 40, name: "Acuvision X", img: "/images/acuvisionx.jpg", cat: "ოპტიკა", 
      description: "სტომატოლოგიური მიკროსკოპი. VarioFocus ტექნოლოგია.", 
      specs: ["Focus 200-450mm", "4K ჩაშენებული კამერა", "გერმანული Schott ოპტიკა"] 
    },
    { 
      id: 41, name: "Brilliance", img: "/images/brilliance.jpg", cat: "ოპტიკა", 
      description: "პროფესიონალური სტომატოლოგიური ლუპები.", 
      specs: ["Galilean სისტემა", "მაღალი გარჩევადობა", "მოსახერხებელი Flip-up"] 
    },
    { 
      id: 42, name: "Brilliance BP", img: "/images/brilliancebp.png", cat: "ოპტიკა", 
      description: "სპორტული ჩარჩოს მქონე ლუპები.", 
      specs: ["ულტრა-მსუბუქი", "რეგულირებადი ცხვირის საყრდენი", "ფართო ხედვის არე"] 
    },
    { 
      id: 43, name: "Brilliance 48°", img: "/images/brilliance48.png", cat: "ოპტიკა", 
      description: "ერგონომიული ერგო-ლუპები.", 
      specs: ["Ergo-Prism ტექნოლოგია", "კისრის დაცვა", "მაღალი გადიდება"] 
    },
    { 
      id: 44, name: "Brilliance 48° Pro", img: "/images/brilliance48pro.jpg", cat: "ოპტიკა", 
      description: "პროფესიონალური ერგო-ლუპები.", 
      specs: ["მაქსიმალური დეტალიზაცია", "ანტი-რეფლექსური საფარი", "პრემიუმ ხარისხი"],
      aiFeatures: [
        { icon: "check", title: "Schott Glass", desc: "გერმანული მინები მაქსიმალური გამჭვირვალობისთვის." },
        { icon: "shield", title: "Neck Protect", desc: "48° დახრა იცავს კისერსა და ხერხემალს." },
        { icon: "zap", title: "Super Light", desc: "დამზადებულია მაგნიუმის შენადნობისგან (ულტრა მსუბუქი)." }
      ]
    },
    { 
      id: 45, name: "Wireless Z+", img: "/images/wirelessz.jpg", cat: "ოპტიკა", 
      description: "უსადენო განათება ლუპებისთვის.", 
      specs: ["100,000 Lux", "წონა: 12გ", "2 ელემენტი ნაკრებში"] 
    },

    // --- SURGERY & OTHERS ---
    { 
      id: 46, name: "MotorSurg", img: "/images/motorsurg.png", cat: "ქირურგია", 
      description: "პროფესიონალური ფიზიოდისპენსერი.", 
      specs: ["80 N.cm Torque", "Brushless ძრავი", "Bluetooth პედალი (ოპციონალური)"] 
    },
    { 
      id: 47, name: "Motorturbo & E-asp1", img: "/images/motorturbo.png", cat: "ქირურგია", 
      description: "ქირურგიული ელექტრო მოტორი და ასპირაციის სისტემა.", 
      specs: ["1:5 თავაკის მხარდაჭერა", "ძლიერი ასპირაცია", "ჩუმი მუშაობა"] 
    },
    { 
      id: 48, name: "SurfyOne", img: "/images/surfyone.png", cat: "ქირურგია", 
      description: "მაღალი სიმძ₾ავრის სონიკ აქტივაოტორი.", 
      specs: ["სილერის განაწილების რეჟიმი", "სენსორული მართვა", "ფართო თავაკების ნაკრები"] 
    },
    { 
      id: 49, name: "CuringPen-X", img: "/images/curinpenx.png", cat: "სხვა", 
      description: "მრავალფუნქციური პოლიმერიზაციის ნათურა.", 
      specs: ["3000 mW/cm²", "360° მბრუნავი თავაკი", "კარიეს დეტექტორი"] 
    },
    { 
      id: 50, name: "CuringPen", img: "/images/curingpen.jpg", cat: "სხვა", 
      description: "კლასიკური უსადენო პოლიმერიზაციის ნათურა.", 
      specs: ["Broadband LED", "4 სამუშაო რეჟიმი", "ერგონომიული სახელური"] 
    },
    { 
      id: 53, name: "E-Sanit", img: "/images/esanit.png", cat: "ჰიგიენა", 
      description: "B-კლასის ავტოკლავი.", 
      specs: ["23L მოცულობა", "B-Class Standard", "ჩაშენებული პრინტერი"] 
    }
];