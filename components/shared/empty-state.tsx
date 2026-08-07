import { Mascot, type MascotScene } from "./mascot";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  mascotScene?: MascotScene;
}

export function EmptyState({ title, description, action, mascotScene = "hold-folder" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Mascot scene={mascotScene} size="lg" className="mb-6" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
