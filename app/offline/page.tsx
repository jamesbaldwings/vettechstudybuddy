import { Buddy } from "@/components/Buddy";

export const metadata = { title: "You're offline" };

export default function Offline() {
  return (
    <Buddy>
      <p>
        Looks like you&apos;re offline. Pages you&apos;ve already opened, like your results and plan, still work. Reconnect to
        save answers or take the diagnostic.
      </p>
    </Buddy>
  );
}
