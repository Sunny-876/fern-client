import { IHudElement } from '../IHudElement';

export interface SnapGuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number; // x for vertical, y for horizontal
  start: number;
  end: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: SnapGuideLine[];
}

export class AlignmentEngine {
  public snapDistance = 8; // Snap threshold in pixels
  public snapToScreen = true;
  public snapToElements = true;

  /**
   * Evaluates snapping for a proposed element position against screen and other elements.
   * Input: absolute screen coordinates (targetX, targetY, targetWidth, targetHeight).
   */
  public computeSnap(
    targetX: number,
    targetY: number,
    targetWidth: number,
    targetHeight: number,
    screenWidth: number,
    screenHeight: number,
    otherElements: IHudElement[],
    safeMargin = 10
  ): SnapResult {
    let bestX = targetX;
    let bestY = targetY;
    let minDiffX = this.snapDistance + 1;
    let minDiffY = this.snapDistance + 1;
    let snappedX = false;
    let snappedY = false;
    const guides: SnapGuideLine[] = [];

    const targetCenterX = targetX + Math.round(targetWidth / 2);
    const targetRight = targetX + targetWidth;
    const targetCenterY = targetY + Math.round(targetHeight / 2);
    const targetBottom = targetY + targetHeight;

    // 1. Screen boundaries & screen center snapping
    if (this.snapToScreen) {
      // Left safe margin
      const diffLeft = Math.abs(targetX - safeMargin);
      if (diffLeft < minDiffX) {
        minDiffX = diffLeft;
        bestX = safeMargin;
        snappedX = true;
        guides.push({ orientation: 'vertical', position: safeMargin, start: 0, end: screenHeight });
      }

      // Horizontal Center
      const screenCenterX = Math.round(screenWidth / 2);
      const diffCenterX = Math.abs(targetCenterX - screenCenterX);
      if (diffCenterX < minDiffX) {
        minDiffX = diffCenterX;
        bestX = screenCenterX - Math.round(targetWidth / 2);
        snappedX = true;
        guides.push({ orientation: 'vertical', position: screenCenterX, start: 0, end: screenHeight });
      }

      // Right safe margin
      const diffRight = Math.abs(targetRight - (screenWidth - safeMargin));
      if (diffRight < minDiffX) {
        minDiffX = diffRight;
        bestX = screenWidth - safeMargin - targetWidth;
        snappedX = true;
        guides.push({ orientation: 'vertical', position: screenWidth - safeMargin, start: 0, end: screenHeight });
      }

      // Top safe margin
      const diffTop = Math.abs(targetY - safeMargin);
      if (diffTop < minDiffY) {
        minDiffY = diffTop;
        bestY = safeMargin;
        snappedY = true;
        guides.push({ orientation: 'horizontal', position: safeMargin, start: 0, end: screenWidth });
      }

      // Vertical Middle
      const screenCenterY = Math.round(screenHeight / 2);
      const diffCenterY = Math.abs(targetCenterY - screenCenterY);
      if (diffCenterY < minDiffY) {
        minDiffY = diffCenterY;
        bestY = screenCenterY - Math.round(targetHeight / 2);
        snappedY = true;
        guides.push({ orientation: 'horizontal', position: screenCenterY, start: 0, end: screenWidth });
      }

      // Bottom safe margin
      const diffBottom = Math.abs(targetBottom - (screenHeight - safeMargin));
      if (diffBottom < minDiffY) {
        minDiffY = diffBottom;
        bestY = screenHeight - safeMargin - targetHeight;
        snappedY = true;
        guides.push({ orientation: 'horizontal', position: screenHeight - safeMargin, start: 0, end: screenWidth });
      }
    }

    // 2. Inter-element snapping
    if (this.snapToElements) {
      for (const el of otherElements) {
        if (!el.enabled) continue;
        const pos = el.getCalculatedPosition(screenWidth, screenHeight);
        const otherLeft = pos.screenX;
        const otherRight = pos.screenX + pos.renderWidth;
        const otherTop = pos.screenY;
        const otherBottom = pos.screenY + pos.renderHeight;

        // Snap left-to-left
        if (Math.abs(targetX - otherLeft) < minDiffX) {
          minDiffX = Math.abs(targetX - otherLeft);
          bestX = otherLeft;
          snappedX = true;
          guides.push({ orientation: 'vertical', position: otherLeft, start: Math.min(targetY, otherTop), end: Math.max(targetBottom, otherBottom) });
        }
        // Snap right-to-left (stack horizontally)
        if (Math.abs(targetX - otherRight) < minDiffX) {
          minDiffX = Math.abs(targetX - otherRight);
          bestX = otherRight;
          snappedX = true;
          guides.push({ orientation: 'vertical', position: otherRight, start: Math.min(targetY, otherTop), end: Math.max(targetBottom, otherBottom) });
        }
        // Snap top-to-top
        if (Math.abs(targetY - otherTop) < minDiffY) {
          minDiffY = Math.abs(targetY - otherTop);
          bestY = otherTop;
          snappedY = true;
          guides.push({ orientation: 'horizontal', position: otherTop, start: Math.min(targetX, otherLeft), end: Math.max(targetRight, otherRight) });
        }
        // Snap bottom-to-top (stack vertically)
        if (Math.abs(targetY - otherBottom) < minDiffY) {
          minDiffY = Math.abs(targetY - otherBottom);
          bestY = otherBottom;
          snappedY = true;
          guides.push({ orientation: 'horizontal', position: otherBottom, start: Math.min(targetX, otherLeft), end: Math.max(targetRight, otherRight) });
        }
      }
    }

    return {
      x: bestX,
      y: bestY,
      snappedX,
      snappedY,
      guides,
    };
  }

  /**
   * Snaps a position to a grid of arbitrary pixel size.
   */
  public snapToGrid(val: number, gridSize: number): number {
    if (gridSize <= 1) return val;
    return Math.round(val / gridSize) * gridSize;
  }
}
