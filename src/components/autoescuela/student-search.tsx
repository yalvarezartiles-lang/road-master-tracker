import * as React from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StudentManager } from "@/components/autoescuela/student-manager";

export function StudentSearch() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 rounded-2xl" aria-label="Gestión de alumnos">
          <Search className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-full flex-col gap-4 rounded-none border-0 p-4 pt-6 sm:max-w-full">
        <DialogTitle className="text-2xl font-bold tracking-tight">Gestión de alumnos</DialogTitle>
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col"><StudentManager onNavigate={() => setOpen(false)} /></div>
      </DialogContent>
    </Dialog>
  );
}
