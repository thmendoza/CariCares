import { Mascot } from "@/components/shared/mascot";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function GreetingHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Mascot scene="greet" size="md" />
      <div>
        <h1 className="text-h1 text-foreground">
          {timeOfDayGreeting()}, {name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">Welcome back.</p>
      </div>
    </div>
  );
}
