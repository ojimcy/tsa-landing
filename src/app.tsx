import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { PrivateSale } from "@/components/sections/private-sale";
import { DownloadCta } from "@/components/sections/download-cta";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <PrivateSale />
        <DownloadCta />
      </main>
      <Footer />
    </div>
  );
}
