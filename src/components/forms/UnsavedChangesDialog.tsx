import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { useBlocker } from "react-router-dom";

type Blocker = ReturnType<typeof useBlocker>;

interface Props {
  blocker: Blocker;
}

/**
 * Renders the "You have unsaved changes" confirmation when a router-blocker is active.
 * Pair with useUnsavedChanges().
 */
const UnsavedChangesDialog = ({ blocker }: Props) => {
  const open = blocker.state === "blocked";
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && blocker.state === "blocked") blocker.reset?.();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            If you leave this page now, your changes will be lost. Are you sure?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.proceed?.()}>
            Leave without saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesDialog;