"use client";

export default function ContactPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    alert("მოთხოვნა გაგზავნილია (დემო). შემდეგ ეტაპზე CRM/Email-ზე დავაბავთ.");
    e.currentTarget.reset();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <h1 className="text-3xl font-bold">ფასის მოთხოვნა / დემოს დაჯავშნა</h1>
          <p className="mt-2 text-slate-600">
            დატოვე მონაცემები და მალე დაგიკავშირდებით შეთავაზებით.
          </p>

          <div className="mt-6 rounded-3xl bg-slate-50 p-6">
            <div className="text-sm font-semibold">კონტაქტი</div>
            <div className="mt-2 text-sm text-slate-600">თბილისი, საქართველო</div>
            <div className="mt-1 text-sm text-slate-600">WhatsApp: ჩაანაცვლე ნომერი ქვემოთ</div>

            <a
              className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-3 text-white hover:opacity-90 transition"
              href="https://wa.me/995514011116"
              target="_blank"
              rel="noreferrer"
              title="ჩაანაცვლე ნომერი შენით"
            >
              WhatsApp-ზე მომწერე
            </a>

            <div className="mt-2 text-xs text-slate-500">
              შენიშვნა: WhatsApp ბმულში ჩაანაცვლე <b>995514011116</b> შენი რეალური ნომრით.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-6">
          <div className="text-lg font-semibold">მოთხოვნის ფორმა</div>
          <div className="mt-4 grid gap-3">
            <input className="rounded-xl border px-4 py-3" placeholder="სახელი და გვარი" required />
            <input className="rounded-xl border px-4 py-3" placeholder="ტელეფონი / WhatsApp" required />
            <input className="rounded-xl border px-4 py-3" placeholder="კლინიკის დასახელება (სურვილით)" />
            <input className="rounded-xl border px-4 py-3" placeholder="რა გაინტერესებს? (CBCT/სკანერი/სავარძელი…)" required />
            <button className="rounded-xl bg-slate-900 px-5 py-3 text-white hover:opacity-90 transition" type="submit">
              გაგზავნა
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            შემდეგ ეტაპზე ამ ფორმას დავაბამთ Email/Google Sheets/CRM-ზე.
          </div>
        </form>
      </div>
    </main>
  );
}
