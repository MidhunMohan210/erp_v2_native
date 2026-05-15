declare module "sonner-native" {
  import type { ComponentType } from "react";

  export const Toaster: ComponentType<Record<string, unknown>>;

  export const toast: {
    (message: string): void;
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
  };
}
