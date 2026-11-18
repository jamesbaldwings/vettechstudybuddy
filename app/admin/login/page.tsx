import { redirect } from "next/navigation";

// The old key-based admin sign-in is gone; owners sign in with their own account.
export default function OldAdminLogin() {
  redirect("/signin?next=/admin");
}
