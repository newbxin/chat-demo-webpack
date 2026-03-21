import { FilesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/workspace/tooltip";

import { useArtifacts } from "./context";

export const ArtifactTrigger = () => {
  const { artifacts, setOpen: setArtifactsOpen } = useArtifacts();

  if (!artifacts || artifacts.length === 0) {
    return null;
  }
  return (
    <Tooltip content="Show artifacts of this conversation">
      <Button
        className="text-muted-foreground hover:text-foreground"
        variant="ghost"
        onClick={() => {
          setArtifactsOpen(true);
        }}
      >
        <FilesIcon />
        Artifacts
      </Button>
    </Tooltip>
  );
};
