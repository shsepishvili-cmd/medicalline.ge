# კომუნიკაციების ცენტრი — Medical Line Georgia

## მიზანი და სტატუსი

არსებულ Next.js ადმინისტრაციულ პანელს დაემატა ქართული ინტერფეისი:
`/admin/communications`. არხების ერთიანი მართვისთვის გამოყენებულია
[Chatwoot](https://github.com/chatwoot/chatwoot) (ღია კოდის საკომუნიკაციო პლატფორმა),
რომელიც CRM-ს უკავშირდება სერვერული API-ით.

**ეს განშტოება საცდელია.** სოციალური ქსელები, SMS და ტელეფონია თავისთავად
არ დაკავშირებულა. აუცილებელია ქვემოთ ჩამოთვლილი ანგარიშების გამართვა,
ბაზის მომზადება და ფუნქციური შემოწმება. `main` უცვლელია.

## რა არის უკვე კოდში

- `/admin/communications`: კლიენტების ძებნა, არხების ფილტრები, საუბრის ისტორია და პასუხი.
- `/api/admin/communications`: მხოლოდ აქტიური ადმინისტრატორის Supabase JWT-ის
  საფუძველზე დაშვებული სერვერული კავშირი Chatwoot-თან.
- `/api/integrations/chatwoot/webhook`: Chatwoot-იდან საკონტაქტო მონაცემებისა და
  მოვლენების მიღება ხელმოწერის გადამოწმებით, გამეორებული მოთხოვნების გაფილტვრით.
- `/api/integrations/telephony/events`: SIP/ვირტუალური სატელეფონო სადგურის
  (PBX) მოვლენების მისაღები დაცული API. რეალური ოპერატორი ჯერ არ არის დაკავშირებული.
- `supabase/sql/32_communications_chatwoot.sql`: დამატებითი კონტაქტებისა და
  მოვლენების ცხრილები; RLS-ით წვდომა მხოლოდ აქტიურ ადმინისტრატორებს აქვთ.
- მოქმედი გარანტიის, ინვოისებისა და შეთავაზებების ცხრილები არ შეცვლილა.

## 1. Chatwoot-ის გამართვა

მოამზადეთ Chatwoot Cloud ანგარიში ან ცალკე სერვერზე საკუთარი ინსტანცია.
Chatwoot-ის `Inboxes` განყოფილებაში დააკავშირეთ:

1. WhatsApp Business Platform / Cloud API — კომპანიის ნომერი.
2. Facebook Page Messenger — კომპანიის Facebook გვერდი.
3. Instagram Professional — კომპანიის Instagram ანგარიში.
4. SMS — შესაბამისი პროვაიდერის (მაგ., Twilio) მხარდაჭერილი შემომავალი და გამავალი SMS.
5. სურვილისამებრ — ვებსაიტის ჩატი და ელფოსტა.

**შეზღუდვები:** WhatsApp-ის პირადი ანგარიშის ჩვეულებრივი მიმოწერა Cloud API-ით
ავტომატურად არ იმპორტირდება. Meta-სგან საჭირო შეიძლება იყოს ბიზნესის
ვერიფიკაცია, ნებართვები და შაბლონების დამტკიცება. Facebook-ის რეკლამებიდან
მიღებული ლიდები ცალკე Lead Ads ინტეგრაციას მოითხოვს; მხოლოდ Messenger-ის
დაკავშირება მათ არ ჩამოტვირთავს.

## 2. Vercel-ის საიდუმლო პარამეტრები

Vercel → პროექტი → Settings → Environment Variables.
ყველა პარამეტრი სერვერულია და **არცერთი არ უნდა იწყებოდეს** `NEXT_PUBLIC_`-ით,
გარდა ქვემოთ უკვე არსებული Supabase URL-ისა.

```dotenv
CHATWOOT_BASE_URL=https://your-chatwoot-domain.example
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_API_TOKEN=your-secret-chatwoot-personal-access-token
CHATWOOT_WEBHOOK_SECRET=secret-shown-in-chatwoot-webhook-settings
COMMUNICATION_TELEPHONY_WEBHOOK_SECRET=long-random-secret-for-pbx-adapter
SUPABASE_SERVICE_ROLE_KEY=secret-supabase-key-server-side-only
# უკვე არსებული:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=publishable-or-legacy-anon-key
```

არ შეინახოთ მოქმედი გასაღებები GitHub-ზე, კოდში ან ბრაუზერის პარამეტრებში.
Chatwoot API ტოკენს მხოლოდ Next.js სერვერი იყენებს.

## 3. მონაცემთა ბაზა

ჯერ შეინახეთ მოქმედი Supabase პროექტის სარეზერვო ასლი და გადაამოწმეთ
სწორი პროექტი. SQL ფაილი `supabase/sql/32_communications_chatwoot.sql`
ჯერ გაუშვით **საცდელ გარემოში**. შემდეგ გადაამოწმეთ RLS და მხოლოდ
წარმატებული ტესტის შემდეგ გადაიტანეთ საწარმოო ბაზაში.

ღონისძიებები და კონტაქტები ცალკე ცხრილებში ინახება. Chatwoot-ის
კონტაქტის ნომრის დამთხვევა ავტომატურად არ აერთიანებს სხვადასხვა ადამიანების
ბარათებს; არსებული `profiles` ცხრილი ხელუხლებელია.

## 4. Chatwoot Webhook

Chatwoot → Settings → Integrations → Webhooks.
Callback URL:

```
https://medicalline.ge/api/integrations/chatwoot/webhook
```

აირჩიეთ: `conversation_created`, `conversation_updated`,
`message_created`, `message_updated`, `conversation_status_changed`,
თუ ეს მოვლენები ხელმისაწვდომია თქვენს Chatwoot ვერსიაში.
ხელმოწერის საიდუმლო იგივე უნდა იყოს, რაც `CHATWOOT_WEBHOOK_SECRET`.

Webhook იყენებს `X-Chatwoot-Signature` და `X-Chatwoot-Timestamp` სათაურებს.
აუცილებლად შეამოწმეთ ნამდვილი საცდელი მოვლენის ჩაწერა ბაზაში.
ხელმოწერის შეცდომისას მოთხოვნა უარყოფილია.

## 5. ტელეფონია

საჭიროა კომპანიის ნომრის მომსახურე ოპერატორი ან PBX/SIP სისტემა,
რომელიც გამოტოვებული, შემომავალი და გამავალი ზარების მოვლენებს
API-ით გზავნის. არსებული პირადი მობილური SIM-ის ზარები საიტის
კოდიდან **ავტომატურად ვერ იკითხება**.

მიმღები URL:

```
https://medicalline.ge/api/integrations/telephony/events
```

PBX-ის შუამავალმა უნდა გაგზავნოს `POST` JSON:

```json
{
  "call_id": "unique-provider-call-id",
  "phone_number": "+9955XXXXXXXX",
  "direction": "incoming",
  "status": "missed",
  "duration_seconds": 0
}
```

სათაურები:
- `X-ML-Timestamp`: მიმდინარე Unix დრო წამებში.
- `X-ML-Signature`: `sha256=` + HMAC-SHA256(hex) საიდუმლოთი
  `${timestamp}.${raw_json_body}` ტექსტზე.

საჭიროა კონკრეტული PBX-ის API ფორმატის ადაპტერის დამზადება.
ზარების ჩანაწერები არ ინახება; ამისთვის ცალკე სამართლებრივი და ტექნიკური
გადაწყვეტილებაა საჭირო.

## 6. SMS

პროექტში უკვე არის GoSMS-ით **გამავალი SMS-ის** გაგზავნის ფუნქცია
(`app/lib/sms-provider.ts`). ეს თავისთავად არ ნიშნავს, რომ GoSMS-დან
შემოსული პასუხებიც ხელმისაწვდომია ან Chatwoot-ში ჩანს. ამისთვის
მომწოდებლის ორმხრივი SMS API ან ცალკე ინტეგრაციაა საჭირო.
SMS-ის სრული ერთიანი ისტორიისთვის შესაბამისი Chatwoot inbox უნდა გაიმართოს.

## 7. გაშვებამდე შემოწმება

1. `npm run build`, `npx tsc --noEmit` და ფუნქციური ტესტები.
2. ადმინისტრატორი შედის, ხოლო ექიმის ან ანონიმური ანგარიში უარყოფილია.
3. WhatsApp-დან საცდელი შეტყობინება ჩნდება სიაში და პასუხი იგზავნება.
4. იგივე ტესტი ტარდება Messenger-სა და Instagram-ზე.
5. Chatwoot webhook-ის ხელმოწერა მოწმდება; არასწორი ხელმოწერა იბლოკება.
6. დუბლირებული მოვლენები არ ქმნის ორმაგ ჩანაწერს.
7. SMS-ის და PBX-ის მიმღები არხები ცალკე მოწმდება.
8. კონტროლდება პერსონალური მონაცემების წვდომა, შენახვის ვადა და თანხმობა.

**განშტოების გაერთიანება/საწარმოო გამოქვეყნება მხოლოდ შემოწმების შემდეგ.**
