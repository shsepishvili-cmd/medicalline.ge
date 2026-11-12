import Link from 'next/link'
import { buildPageMetadata } from '@/app/lib/seo'
import { merchant } from '@/app/lib/merchant'
import { WARRANTY_POLICY_SECTIONS } from '@/app/lib/warranty-catalog'
import { CategoryExplorer, WarrantyLookup } from './WarrantyInteractive'
import styles from './warranty.module.css'

export const metadata = buildPageMetadata({
  path: '/warranty',
  title: 'გარანტია და სერვისი | Medical Line Georgia',
  description:
    'სტომატოლოგიური აპარატურის საგარანტიო პირობები, პროდუქციის კატეგორიების ტექნიკური მითითებები და საგარანტიო სერტიფიკატის ონლაინ შემოწმება.',
  keywords: ['გარანტია', 'საგარანტიო სერტიფიკატი', 'სტომატოლოგიური აპარატურის სერვისი', 'Medical Line Georgia'],
})

export default function WarrantyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={`${styles.wrap} ${styles.topInner}`}>
          <Link className={styles.brand} href="/" aria-label="Medical Line Georgia">
            <span className={styles.brandMark}>
              <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M13 8c-5 1-7 8-4 16l6 14c2 4 5 3 6-1l3-10 3 10c1 4 4 5 6 1l6-14c3-8 1-15-4-16-4-1-7 1-11 2-4-1-7-3-11-2Z" fill="white" />
                <path d="M13 20h6l3-5 5 13 3-8h5" stroke="#d72c47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <strong>MEDICAL LINE</strong>
              <small>GEORGIA · WARRANTY</small>
            </span>
          </Link>
          <nav className={styles.topNav} aria-label="გარანტიის გვერდის ნავიგაცია">
            <a href="#categories">კატეგორიები</a>
            <a href="#policy">საგარანტიო პირობები</a>
            <a href="#check">სერტიფიკატის შემოწმება</a>
            <a href="#contact">კონტაქტი</a>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={styles.eyebrow}>MEDICAL LINE GEORGIA · SERVICE &amp; SUPPORT</div>
          <h1>გარანტია, რომელსაც<br />საიმედო სერვისი ახლავს</h1>
          <div className={styles.heroLine} />
          <p>
            სტომატოლოგიური აპარატურის საგარანტიო პირობები, პროდუქციის კატეგორიებისთვის განკუთვნილი ტექნიკური
            მითითებები და ინდივიდუალური საგარანტიო ბარათის შემოწმება — ერთ სივრცეში.
          </p>
          <div className={styles.heroMeta}>
            <span>პროდუქციის 15 კატეგორია</span>
            <span>ინდივიდუალური საგარანტიო ბარათი</span>
            <span>ტექნიკური მხარდაჭერა</span>
          </div>
        </div>
      </section>

      <main className={`${styles.wrap} ${styles.main}`}>
        <section className={styles.intro}>
          <article>
            <div className={styles.icon}>✓</div>
            <h3>გამჭვირვალე პირობები</h3>
            <p>ყველა მოწყობილობის გარანტიის ვადა და დაფარვა მითითებულია შესაბამის დოკუმენტში.</p>
          </article>
          <article>
            <div className={styles.icon}>⚙</div>
            <h3>ტექნიკური მხარდაჭერა</h3>
            <p>დიაგნოსტიკა, საჭიროების შემთხვევაში შეკეთება და მწარმოებელთან ტექნიკური კომუნიკაცია.</p>
          </article>
          <article>
            <div className={styles.icon}>▤</div>
            <h3>ერთიანი დოკუმენტაცია</h3>
            <p>საგარანტიო ბარათი, მოწყობილობის მონაცემები და მონტაჟის ინფორმაცია ერთ დოკუმენტში.</p>
          </article>
        </section>

        <section id="categories">
          <div className={styles.head}>
            <div>
              <h2>პროდუქციის კატეგორიები</h2>
              <p>აირჩიეთ კატეგორია და გაეცანით მის ტექნიკურ თავისებურებებს.</p>
            </div>
            <span className={styles.count}>15 კატეგორია</span>
          </div>
          <CategoryExplorer />
        </section>

        <section id="policy" className={styles.spaced}>
          <div className={styles.head}>
            <div>
              <h2>საგარანტიო მომსახურების პირობები</h2>
              <p>მოქმედებს ინდივიდუალურ ბარათსა და ხელშეკრულებაში განსაზღვრულ პირობებთან ერთად.</p>
            </div>
          </div>
          <div className={styles.policy}>
            {WARRANTY_POLICY_SECTIONS.map((section, index) => (
              <details key={section.title} open={index === 0}>
                <summary>{String(index + 1).padStart(2, '0')}. {section.title}</summary>
                <p>{section.text}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="check" className={styles.spaced}>
          <div className={styles.head}>
            <div>
              <h2>საგარანტიო სერტიფიკატის შემოწმება</h2>
              <p>ინდივიდუალურ ბარათს გასცემს Medical Line Georgia. შეიყვანეთ მონაცემები და ნახეთ გარანტიის მიმდინარე სტატუსი.</p>
            </div>
          </div>
          <WarrantyLookup />
        </section>

        <section className={styles.contact} id="contact">
          <div>
            <h3>გჭირდებათ ტექნიკური დახმარება?</h3>
            <p>დაგვიკავშირდით მოწყობილობის მოდელითა და სერიული ნომრით.</p>
          </div>
          <div>
            <a href={merchant.phoneHref}>{merchant.phone}</a>
            <br />
            <a href={merchant.emailHref}>{merchant.email}</a>
          </div>
        </section>
      </main>
    </div>
  )
}
