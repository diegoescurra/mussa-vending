import { Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
export function StateMessage({ title, description }: { title: string; description: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <span className="mb-4 rounded-xl bg-muted p-3">
          <Inbox className="size-6 text-muted-foreground" />
        </span>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
