import { useEffect, useState } from "react";

import { Panel } from "./Panel";

export interface AppProps {
  defaultOpen?: boolean;
  registerOpen: (open: () => void) => void;
}

export function App({ defaultOpen = false, registerOpen }: AppProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    registerOpen(() => setOpen(true));
  }, [registerOpen]);

  return <Panel open={open} onClose={() => setOpen(false)} />;
}
