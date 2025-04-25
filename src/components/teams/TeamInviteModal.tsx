import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { inviteToTeam } from "@/lib/actions/teams";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  inviteCode: string;
}

export function TeamInviteModal({
  isOpen,
  onClose,
  teamId,
  inviteCode,
}: TeamInviteModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const inviteMutation = useMutation({
    mutationFn: async (emailsToInvite: string[]) => {
      return Promise.all(
        emailsToInvite.map((email) => inviteToTeam(teamId, email))
      );
    },
    onSuccess: () => {
      toast({
        title: "Invitations sent",
        description: `Invitations have been sent to ${emails.length} email${
          emails.length > 1 ? "s" : ""
        }`,
      });
      setEmails([]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send invitations",
        variant: "destructive",
      });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  const addEmail = () => {
    const trimmedEmail = currentEmail.trim();
    if (
      trimmedEmail &&
      emailRegex.test(trimmedEmail) &&
      !emails.includes(trimmedEmail)
    ) {
      setEmails([...emails, trimmedEmail]);
      setCurrentEmail("");
    } else if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentEmail) {
      addEmail();
    }
    if (emails.length === 0) return;
    inviteMutation.mutate(emails);
  };

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/teams/join?code=${inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Code Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Team Invite Code</label>
            <div className="flex gap-2">
              <Input
                type={showInviteCode ? "text" : "password"}
                value={inviteCode}
                readOnly
                className="font-mono"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowInviteCode(!showInviteCode)}>
                {showInviteCode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={copyInviteCode}
                className={cn(copied && "text-green-500")}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or invite via email
              </span>
            </div>
          </div>

          {/* Email Invite Section */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-3">
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emails.map((email) => (
                    <Badge key={email} variant="secondary">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                type="email"
                placeholder="Enter email addresses (press Enter or comma to add)"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => currentEmail && addEmail()}
              />
              <Alert>
                <AlertDescription>
                  You can add multiple email addresses by pressing Enter or using commas
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={inviteMutation.isPending || (emails.length === 0 && !currentEmail)}>
                {inviteMutation.isPending
                  ? "Sending..."
                  : `Send Invite${emails.length > 0 ? "s" : ""}`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}