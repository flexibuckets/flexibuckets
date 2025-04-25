import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface TeamSubscriptionCheckProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TeamSubscriptionDialog({ isOpen, onClose }: TeamSubscriptionCheckProps) {
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Team Plan</DialogTitle>
          <DialogDescription>
            Teams feature requires a team subscription. Upgrade your plan to collaborate with others.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => router.push("/pricing")}>
            View Team Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 