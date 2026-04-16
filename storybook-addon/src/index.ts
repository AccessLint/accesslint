import { definePreviewAddon } from "storybook/internal/csf";
import type { ProjectAnnotations, Renderer } from "storybook/internal/types";
import * as addonAnnotations from "./preview";

export default () =>
  definePreviewAddon(addonAnnotations as ProjectAnnotations<Renderer>);
