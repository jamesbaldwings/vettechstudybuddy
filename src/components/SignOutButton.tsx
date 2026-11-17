"use client";
export default function SignOutButton() {
  return (
    <button
      className="linklike"
      onClick={async () => {
        await fetch("/api/auth/signout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      Sign out
    </button>
  );
}
