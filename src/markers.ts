import type { ElementGroup } from "./model.ts";

type Box = { x: number; y: number; width: number; height: number };
export function markerPosition(
  rect: Box,
  occupied: Box[],
  width: number,
  height: number,
): Box | null {
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 5; column++) {
      const next = {
        x: Math.max(2, Math.min(rect.x + column * 38, width - 36)),
        y: Math.max(2, Math.min(rect.y + row * 34, height - 32)),
        width: 32,
        height: 28,
      };
      if (
        !occupied.some(
          (box) =>
            next.x < box.x + box.width + 3 &&
            next.x + next.width + 3 > box.x &&
            next.y < box.y + box.height + 3 &&
            next.y + next.height + 3 > box.y,
        )
      )
        return next;
    }
  return null;
}

export class Markers {
  readonly host = document.createElement("div");
  private shadow = this.host.attachShadow({ mode: "open" });
  private layer = document.createElement("div");
  private groups: ElementGroup[] = [];
  private elements = new Map<string, Element>();
  private selected: string | null = null;
  private frame = 0;
  private resize = new ResizeObserver(() => this.schedule());

  private onSelect: (id: string) => void;
  constructor(onSelect: (id: string) => void) {
    this.onSelect = onSelect;
    this.host.setAttribute("data-a11y-glance", "");
    this.host.style.cssText =
      "all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;";
    const style = document.createElement("style");
    style.textContent = `:host{color-scheme:light}*{box-sizing:border-box}.outline{position:fixed;border:2px solid #b32b25;pointer-events:none;background:transparent}.outline.review{border-color:#8a5c00;border-style:dashed}.outline.selected{border-width:3px;box-shadow:0 0 0 2px white}button{all:unset;box-sizing:border-box;position:fixed;width:32px;height:28px;background:#b32b25;color:white;border:1px solid white;border-radius:5px;display:grid;place-items:center;font:600 12px/1 system-ui,sans-serif;cursor:pointer;pointer-events:auto;box-shadow:0 2px 6px #0002}button.review{background:#795300}button:focus-visible{outline:3px solid #254dd8;outline-offset:3px}`;
    this.shadow.append(style, this.layer);
    document.documentElement.append(this.host);
    window.addEventListener("scroll", this.schedule, true);
    window.addEventListener("resize", this.schedule);
    this.resize.observe(document.documentElement);
  }

  update(groups: ElementGroup[], elements: Map<string, Element>, selected: string | null) {
    this.groups = groups;
    this.elements = elements;
    this.selected = selected;
    this.resize.disconnect();
    this.resize.observe(document.documentElement);
    for (const element of elements.values()) if (element.isConnected) this.resize.observe(element);
    this.render();
  }

  private schedule = () => {
    if (!this.frame)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.render();
      });
  };

  private render() {
    const fragment = document.createDocumentFragment();
    const occupied: Box[] = [];
    const focusedId = this.shadow.activeElement?.getAttribute("data-group-id");
    this.groups.forEach((group, index) => {
      const element = this.elements.get(group.id);
      if (!element?.isConnected || !element.getClientRects().length) return;
      const rect = element.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        rect.bottom <= 0 ||
        rect.right <= 0 ||
        rect.top >= innerHeight ||
        rect.left >= innerWidth
      )
        return;
      const review = !group.findings.some((finding) => finding.kind === "issue");
      const outline = document.createElement("div");
      outline.className = `outline${review ? " review" : ""}${this.selected === group.id ? " selected" : ""}`;
      const x = Math.max(0, rect.x),
        y = Math.max(0, rect.y);
      outline.style.cssText = `left:${x}px;top:${y}px;width:${Math.min(innerWidth, rect.right) - x}px;height:${Math.min(innerHeight, rect.bottom) - y}px`;
      fragment.append(outline);
      const position = markerPosition(rect, occupied, innerWidth, innerHeight);
      if (!position) return;
      occupied.push(position);
      const button = document.createElement("button");
      button.type = "button";
      button.className = review ? "review" : "";
      button.setAttribute("data-group-id", group.id);
      button.setAttribute(
        "aria-label",
        `${review ? "Review" : "Issues"} for element ${index + 1}: ${group.label}`,
      );
      button.textContent = `${index + 1}${review ? "?" : ""}`;
      button.style.cssText = `left:${position.x}px;top:${position.y}px`;
      button.addEventListener("click", () => this.onSelect(group.id));
      fragment.append(button);
    });
    this.layer.replaceChildren(fragment);
    if (focusedId)
      this.layer
        .querySelector<HTMLButtonElement>(`[data-group-id="${CSS.escape(focusedId)}"]`)
        ?.focus({ preventScroll: true });
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    window.removeEventListener("scroll", this.schedule, true);
    window.removeEventListener("resize", this.schedule);
    this.host.remove();
  }
}
