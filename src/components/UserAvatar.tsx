import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User2Icon } from "lucide-react";
import { User } from "prisma/prisma-client";

interface UserAvatarProps {
  user: Pick<User, "image" | "name">;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {user.image ? (
        <AvatarImage alt="Picture" src={user.image} />
      ) : (
        <AvatarFallback>
          {user.name?.charAt(0) || <User2Icon className="h-4 w-4" />}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
