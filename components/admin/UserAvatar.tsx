import React from "react";
import { User as UserIcon } from "lucide-react";
import { User } from "@/lib/AuthContext";
import { getMediaUrl } from "@/lib/utils";

interface UserAvatarProps {
  user?: User | null;
  r2BaseUrl?: string | null;
  className?: string;
}

export function UserAvatar({ user, r2BaseUrl, className = "w-10 h-10" }: UserAvatarProps) {
  const filename = user?.profile_picture?.filename || user?.profile_picture?.file_url;
  const mediaUrl = getMediaUrl(r2BaseUrl, filename);

  if (mediaUrl) {
    return (
      <img
        src={mediaUrl}
        alt="User Avatar"
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white border-2 border-white shadow-sm overflow-hidden ${className}`}>
      <UserIcon className="w-1/2 h-1/2" />
    </div>
  );
}
