import { Container } from "@/components/ui/container";

const partners = [
  "Realschule München",
  "Gymnasium Köln-Mitte",
  "GSG Hamburg",
  "Mittelschule Stuttgart",
  "IGS Hannover",
  "Bildungswerk NRW",
];

export function Trust() {
  return (
    <section className="border-b border-border py-14">
      <Container>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-fg">
          Pilotpartner & Designteilnehmer
        </p>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {partners.map((p) => (
            <div
              key={p}
              className="flex h-10 items-center justify-center text-center font-mono text-xs uppercase tracking-wider text-muted-fg/70"
            >
              {p}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
