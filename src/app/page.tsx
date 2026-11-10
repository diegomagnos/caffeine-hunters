import { CoffeeMark } from "@/components/coffee-mark";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-8 sm:px-10">
        <CoffeeMark className="h-9 w-9" />
        <span className="text-lg font-semibold tracking-tight">Caffeine Hunters</span>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 sm:px-10 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="mb-6 inline-flex rounded-full border border-coffee/25 px-4 py-2 text-sm font-medium">Aplicativo em desenvolvimento</p>
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">Caffeine Hunters</h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed">Bons cafés. Novas descobertas. Uma experiência para compartilhar.</p>
          <p className="mt-5 max-w-lg leading-relaxed text-muted">Estamos preparando um espaço para clubes de degustação de café. Por enquanto, a primeira dose está em preparo.</p>
        </div>
        <div aria-hidden="true" className="flex aspect-square w-full max-w-80 items-center justify-center justify-self-center rounded-full bg-sand p-16 lg:max-w-96">
          <CoffeeMark className="h-full w-full text-coffee" />
        </div>
      </main>
      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-sm text-muted sm:px-10">Caffeine Hunters · Feito para quem aprecia cada xícara.</footer>
    </div>
  );
}
