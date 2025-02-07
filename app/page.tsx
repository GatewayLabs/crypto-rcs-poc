"use client";

import GameHeader from "@/components/landing/game-header";
import Footer from "@/components/footer";
import GameDescription from "@/components/landing/game-description";

export default function Landing() {
  return (
    <main className="bg-zinc-950 overflow-hidden px-14 py-12 max-md:px-5 min-h-screen w-full max-md:max-w-full flex flex-col">
      <section className="bg-white border min-h-[804px] w-full rounded-3xl border-white border-solid max-md:max-w-full flex flex-col flex-grow">
        <header className="flex min-h-56 w-full items-center justify-between flex-wrap max-md:max-w-full">
          <GameHeader />
          <GameDescription />
        </header>
        <section className="bg-zinc-950 border w-full rounded-3xl border-white border-solid max-md:max-w-full bg-[url(/landing-bg.svg)] bg-cover flex-grow bg-center flex relative justify-center">
          <img src="/landing-circle.png" className="h-full absolute" />
        </section>
      </section>
      <Footer />
    </main>
  );
}
