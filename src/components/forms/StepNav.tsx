import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

interface StepNavProps {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
}

/**
 * Sticky-style footer for multi-tab forms.
 * - Back button hidden on first step
 * - Next button on intermediate steps
 * - Save button replaces Next on the last step
 * - Save Draft link in the middle (optional)
 */
const StepNav = ({
  isFirst, isLast, onBack, onNext, onSaveDraft, onSave, saving, saveLabel = "Save",
}: StepNavProps) => {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t">
      <div className="flex-1">
        {!isFirst && (
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        )}
      </div>
      <div className="flex-1 flex justify-center">
        {onSaveDraft && (
          <Button type="button" variant="ghost" size="sm" onClick={onSaveDraft} disabled={saving}>
            Save Draft
          </Button>
        )}
      </div>
      <div className="flex-1 flex justify-end">
        {!isLast ? (
          <Button type="button" onClick={onNext} disabled={saving}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : saveLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StepNav;