import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Kontakt | MasterMind",
  description:
    "Nehmen Sie Kontakt mit MasterMind auf — Vertrieb, Support oder Datenschutz-Anfragen.",
};

const contactCards = [
  {
    title: "Vertrieb",
    email: "sales@mastermind.de",
    description: "Beratung zu Tarifen und Testphasen",
    subject: "Vertrieb",
  },
  {
    title: "Support",
    email: "support@mastermind.de",
    description: "Technische Hilfe und Fragen zur Nutzung",
    subject: "Support",
  },
  {
    title: "Datenschutz",
    email: "datenschutz@mastermind.de",
    description: "DSGVO-Anfragen und AVV",
    subject: "Datenschutz",
  },
];

export default function KontaktPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="border-b border-border section">
          <Container>
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
            >
              <ArrowLeft className="size-3.5" />
              Startseite
            </Link>

            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">
                <span className="inline-block size-1.5 bg-brand" />
                Kontakt
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl">Wir sind für Sie da</h1>
              <p className="mt-5 text-lg text-muted-fg">
                Egal ob Fragen zum Produkt, technische Hilfe oder Datenschutzanliegen —
                das richtige Team hilft Ihnen weiter.
              </p>
            </div>
          </Container>
        </section>

        {/* Contact cards */}
        <section className="border-b border-border section">
          <Container>
            <div className="grid gap-6 sm:grid-cols-3">
              {contactCards.map((card) => (
                <article
                  key={card.title}
                  className="flex flex-col border border-border bg-bg p-8 transition-all hover:border-border-strong"
                >
                  <div className="flex size-10 items-center justify-center border border-border bg-surface">
                    <Mail className="size-4 text-brand" />
                  </div>
                  <h2 className="mt-5 text-lg font-bold">{card.title}</h2>
                  <p className="mt-1.5 text-sm text-muted-fg">{card.description}</p>
                  <a
                    href={`mailto:${card.email}`}
                    className="mt-4 font-mono text-sm font-medium text-brand hover:underline"
                  >
                    {card.email}
                  </a>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* Contact form + office info */}
        <section className="border-b border-border section">
          <Container>
            <div className="grid gap-16 lg:grid-cols-2">
              {/* Form */}
              <div>
                <h2 className="text-2xl font-bold">Nachricht schreiben</h2>
                <p className="mt-2 text-sm text-muted-fg">
                  Füllen Sie das Formular aus — wir melden uns in der Regel innerhalb von
                  einem Werktag.
                </p>

                <form
                  action="mailto:kontakt@mastermind.app"
                  method="get"
                  encType="text/plain"
                  className="mt-8 space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="name"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Maria Mustermann"
                        className="border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-fg/50 focus:border-brand"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="email"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
                      >
                        E-Mail
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m.mustermann@schule.de"
                        className="border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-fg/50 focus:border-brand"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="betreff"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
                    >
                      Betreff
                    </label>
                    <select
                      id="betreff"
                      name="subject"
                      className="border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand"
                    >
                      <option value="">Bitte wählen …</option>
                      <option value="Vertrieb">Vertrieb</option>
                      <option value="Support">Support</option>
                      <option value="Datenschutz">Datenschutz</option>
                      <option value="Sonstige">Sonstige</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="nachricht"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-fg"
                    >
                      Nachricht
                    </label>
                    <textarea
                      id="nachricht"
                      name="body"
                      rows={6}
                      placeholder="Wie können wir Ihnen helfen?"
                      className="resize-none border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-fg/50 focus:border-brand"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 bg-brand px-6 text-base font-semibold text-brand-fg transition-colors hover:bg-brand-dark"
                  >
                    Nachricht senden
                    <Mail className="size-4" />
                  </button>
                </form>
              </div>

              {/* Office info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold">Büro</h2>
                  <p className="mt-2 text-sm text-muted-fg">
                    Besuchen Sie uns oder schreiben Sie uns direkt.
                  </p>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface">
                      <MapPin className="size-4 text-brand" />
                    </div>
                    <div>
                      <p className="font-semibold">Adresse</p>
                      <p className="mt-1 text-sm text-muted-fg">
                        {COMPANY.name}
                        <br />
                        {COMPANY.street}
                        <br />
                        {COMPANY.zip} {COMPANY.city}
                        <br />
                        {COMPANY.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface">
                      <Mail className="size-4 text-brand" />
                    </div>
                    <div>
                      <p className="font-semibold">Allgemeiner Kontakt</p>
                      <a
                        href={`mailto:${COMPANY.email}`}
                        className="mt-1 block text-sm font-mono text-brand hover:underline"
                      >
                        {COMPANY.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Handelsregister */}
                <div className="border border-border bg-surface/50 p-5 text-xs text-muted-fg space-y-1">
                  <p>
                    <span className="font-semibold text-fg">Registergericht:</span>{" "}
                    {COMPANY.court}
                  </p>
                  <p>
                    <span className="font-semibold text-fg">HRB:</span> {COMPANY.hrb}
                  </p>
                  <p>
                    <span className="font-semibold text-fg">USt-IdNr.:</span> {COMPANY.vatId}
                  </p>
                  <p>
                    <span className="font-semibold text-fg">Geschäftsführer:</span>{" "}
                    {COMPANY.ceo}
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Subtle legal links */}
        <section className="section">
          <Container>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-fg">
              <Link href="/agb" className="hover:text-fg">
                AGB
              </Link>
              <span aria-hidden>·</span>
              <Link href="/datenschutz" className="hover:text-fg">
                Datenschutz
              </Link>
              <span aria-hidden>·</span>
              <Link href="/impressum" className="hover:text-fg">
                Impressum
              </Link>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
