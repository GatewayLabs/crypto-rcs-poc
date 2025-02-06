import Footer from "@/components/footer";
import Leaderboard from "@/components/game/leaderboard";
import GameBoard from "@/components/game/game-board";
import Header from "@/components/game/game-header";
import MatchHistory from "@/components/game/match-history";

export default function Play() {
  return (
    <main className="bg-zinc-950 flex flex-col overflow-hidden max-md:px-5 min-h-screen w-full max-md:max-w-full px-14 py-12 font-mono">
      <section className="bg-white border self-center rounded-3xl border-white flex-grow flex flex-col w-full">
        <Header />
        <section className="bg-white flex w-full rounded-3xl align-top flex-grow max-lg:flex-col">
          <div className="bg-zinc-950 border self-stretch min-w-60 flex-grow rounded-3xl flex flex-col">
            <GameBoard />
            <MatchHistory />
          </div>
          <Leaderboard />
        </section>
      </section>
      <Footer />
    </main>
  );
}
