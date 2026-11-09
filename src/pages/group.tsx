import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GetTheApp, PayNotice, PayShell } from "@/components/pay/pay-shell";
import { groupAppUrl, isGroupInviteCode } from "@/lib/group";

/**
 * A private group's invite link (/g/:code). It hands off to the app and looks
 * nothing up: a group's name is only for people signed in with the link.
 */
export default function GroupInvitePage() {
  const { code } = useParams<{ code: string }>();
  return (
    <PayShell title="Group invite">
      {code && isGroupInviteCode(code) ? (
        <GroupInviteView code={code} />
      ) : (
        <PayNotice message="This invite link isn't valid. Ask for a new one." />
      )}
    </PayShell>
  );
}

export function GroupInviteView({ code }: { code: string }) {
  const openApp = () => {
    window.location.href = groupAppUrl(code);
  };
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">You&apos;re invited to a private group</h1>
      <p className="mt-2 text-sm text-slate-500">Open TSA Connect to see the group and join it.</p>
      <Button size="lg" className="mt-6 w-full" onClick={openApp}>
        Open in TSA Connect
      </Button>
      <GetTheApp />
    </>
  );
}
