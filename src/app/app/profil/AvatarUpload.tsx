"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { uploadAvatar } from "./actions";

export function AvatarUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <form
        action={uploadAvatar}
        id="avatar-form"
        className="hidden"
      >
        <input
          ref={inputRef}
          id="avatar-input"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              e.target.form?.requestSubmit();
            }
          }}
        />
      </form>
      <button
        type="button"
        aria-label="Avatar ändern"
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 grid size-7 place-items-center bg-fg text-bg transition-transform hover:scale-110"
      >
        <Camera className="size-3.5" />
      </button>
    </>
  );
}
