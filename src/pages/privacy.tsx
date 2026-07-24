import { LegalPage } from "./legal";
import { PRIVACY_POLICY } from "@/data/legal";

export default function PrivacyPage() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
