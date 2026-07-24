import { LegalPage } from "./legal";
import { TERMS_OF_SERVICE } from "@/data/legal";

export default function TermsPage() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
