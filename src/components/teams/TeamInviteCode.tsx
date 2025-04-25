import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useTeamInviteCode } from "@/hooks/use-team-invites";

interface TeamInviteCodeProps {
  teamId: string;
  email: string;
}

export function TeamInviteCode({ teamId,email }: TeamInviteCodeProps) {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  const { mutate: generateCode, isPending } = useTeamInviteCode(teamId,email);

  const handleGenerateCode = () => {
    generateCode(undefined, {
      onSuccess: (data) => {
        setInviteCode(data?.team?.inviteCode || "");
      },
    });
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/teams/join/${inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={inviteCode} readOnly placeholder="Generate an invite code" />
        {inviteCode ? (
          <Button
            size="icon"
            variant="outline"
            onClick={copyToClipboard}
            className="shrink-0"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button onClick={handleGenerateCode} disabled={isPending}>
            {isPending ? "Generating..." : "Generate"}
          </Button>
        )}
      </div>
    </div>
  );
} 