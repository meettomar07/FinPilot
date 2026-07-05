import type { User } from "firebase/auth";

import { Avatar, AvatarFallback, AvatarImage } from "../../app/components/ui/avatar";

function getInitials(user: User | null, fallback = "U") {
  const source = user?.displayName?.trim() || user?.email?.split("@")[0]?.trim() || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AuthUserAvatar({
  user,
  className,
  fallbackClassName,
}: {
  user: User | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {user?.photoURL ? <AvatarImage src={user.photoURL} alt={user.displayName ?? user.email ?? "User"} /> : null}
      <AvatarFallback className={fallbackClassName}>{getInitials(user)}</AvatarFallback>
    </Avatar>
  );
}
