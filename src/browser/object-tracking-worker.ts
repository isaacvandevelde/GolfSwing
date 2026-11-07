import { makeTemplate, matchTemplate } from "../domain/object-tracking";
import type { GrayImage, Template } from "../domain/object-tracking";

let template: Template | null = null;
self.onmessage = (
  event: MessageEvent<{
    type: "init" | "frame";
    image: GrayImage;
    x: number;
    y: number;
    radius: number;
  }>,
) => {
  try {
    const { type, image, x, y, radius } = event.data;
    if (type === "init") {
      template = makeTemplate(image, x, y, radius);
      self.postMessage({ result: true });
    } else {
      if (!template) throw new Error("Mark a target before tracking.");
      self.postMessage({ result: matchTemplate(image, template) });
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Object tracking failed.",
    });
  }
};
