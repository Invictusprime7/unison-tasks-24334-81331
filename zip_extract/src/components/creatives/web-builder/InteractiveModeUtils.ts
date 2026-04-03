/**
 * Interactive Mode Utilities
 * Helper functions for interactive mode element manipulation
 */

export class InteractiveModeUtils {
  /**
   * Find the closest editable element
   */
  static findEditableElement(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element;
    
    while (current) {
      if (
        current.contentEditable === 'true' ||
        current.tagName === 'INPUT' ||
        current.tagName === 'TEXTAREA' ||
        current.tagName === 'SELECT' ||
        current.hasAttribute('data-editable')
      ) {
        return current;
      }
      current = current.parentElement;
    }
    
    return element;
  }

  /**
   * Check if element is interactive
   */
  static isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'];
    return interactiveTags.includes(element.tagName);
  }

  /**
   * Get element selector path
   */
  static getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.tagName !== 'BODY') {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        const classes = current.className.split(' ').filter(Boolean);
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Clone element with positioning offset
   */
  static cloneElement(element: HTMLElement, offsetX = 20, offsetY = 20): HTMLElement {
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Offset position
    const currentLeft = parseInt(element.style.left || '0');
    const currentTop = parseInt(element.style.top || '0');
    
    clone.style.left = `${currentLeft + offsetX}px`;
    clone.style.top = `${currentTop + offsetY}px`;
    
    return clone;
  }

  /**
   * Delete element safely
   */
  static deleteElement(element: HTMLElement): void {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Apply style to element
   */
  static applyStyle(element: HTMLElement, property: string, value: string): void {
    if (element && property && value !== undefined) {
      element.style.setProperty(property, value);
    }
  }

  /**
   * Get computed styles
   */
  static getComputedStyles(element: HTMLElement): CSSStyleDeclaration {
    return window.getComputedStyle(element);
  }

  /**
   * Toggle element visibility
   */
  static toggleVisibility(element: HTMLElement): void {
    if (element.style.display === 'none') {
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  }

  /**
   * Bring element to front
   */
  static bringToFront(element: HTMLElement): void {
    const parent = element.parentElement;
    if (parent) {
      parent.appendChild(element);
    }
  }

  /**
   * Send element to back
   */
  static sendToBack(element: HTMLElement): void {
    const parent = element.parentElement;
    if (parent && parent.firstChild) {
      parent.insertBefore(element, parent.firstChild);
    }
  }

  /**
   * Get element dimensions
   */
  static getDimensions(element: HTMLElement): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * Set element dimensions
   */
  static setDimensions(element: HTMLElement, width: number, height: number): void {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
  }

  /**
   * Get element position
   */
  static getPosition(element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top
    };
  }

  /**
   * Set element position
   */
  static setPosition(element: HTMLElement, x: number, y: number): void {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.position = 'absolute';
  }

  /**
   * Check if point is inside element
   */
  static isPointInside(element: HTMLElement, x: number, y: number): boolean {
    const rect = element.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }
}
