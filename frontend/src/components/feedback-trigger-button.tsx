"use client";

import type { ButtonProps } from "@mui/material";
import { Button } from "@mui/material";

export default function FeedbackTriggerButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          window.dispatchEvent(new Event("budgetnest:open-feedback"));
        }
      }}
    />
  );
}
