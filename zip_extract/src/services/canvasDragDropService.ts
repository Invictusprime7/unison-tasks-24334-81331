/**
 * Canvas Drag & Drop Service
 * Handles drag and drop functionality for canvas elements and section reordering
 */

type DropHandler = (event: DragEvent) => void;

export class CanvasDragDropService {
  private static instance: CanvasDragDropService;
  private handlers: Map<string, DropHandler> = new Map();
  private canvas: HTMLElement | null = null;
  private draggedElement: unknown = null;
  private iframe: HTMLIFrameElement | null = null;
  private initialized = false;
  private onReorderCallback: ((sections: string[]) => void) | null = null;

  static getInstance(): CanvasDragDropService {
    if (!CanvasDragDropService.instance) {
      CanvasDragDropService.instance = new CanvasDragDropService();
    }
    return CanvasDragDropService.instance;
  }

  init(canvas: HTMLElement): void {
    this.canvas = canvas;
  }

  initializeCanvas(canvas: HTMLElement): void {
    this.init(canvas);
  }

  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
    this.initialized = false;
  }

  setOnReorderCallback(callback: (sections: string[]) => void): void {
    this.onReorderCallback = callback;
  }

  initializeIframeDragDrop(): void {
    if (!this.iframe || this.initialized) return;
    
    const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!iframeDoc) return;

    this.injectDragDropStyles(iframeDoc);
    this.initializeSections(iframeDoc);
    this.initialized = true;
    console.log('[CanvasDragDropService] Iframe drag-drop initialized');
  }

  private injectDragDropStyles(doc: Document): void {
    const existingStyle = doc.getElementById('drag-drop-styles');
    if (existingStyle) existingStyle.remove();

    const style = doc.createElement('style');
    style.id = 'drag-drop-styles';
    style.textContent = getDragDropStyles();
    doc.head.appendChild(style);
  }

  private initializeSections(doc: Document): void {
    const selectors = [
      'section',
      '[data-section]',
      '.section',
      'header',
      'footer',
      'nav',
      'main > div',
      'body > div:not(script):not(style)',
      'article'
    ];
    
    const sections = doc.querySelectorAll(selectors.join(', '));
    let sectionIndex = 0;
    
    sections.forEach((section) => {
      const el = section as HTMLElement;
      
      if (el.getAttribute('data-drag-initialized') === 'true') return;
      if (el.closest('.draggable-section') && el !== el.closest('.draggable-section')) return;
      if (el.offsetHeight < 50) return;
      
      sectionIndex++;
      this.makeElementDraggable(el, sectionIndex, doc);
    });
    
    console.log('[CanvasDragDropService] Initialized ' + sectionIndex + ' draggable sections');
  }

  private makeElementDraggable(element: HTMLElement, index: number, doc: Document): void {
    element.classList.add('draggable-section');
    element.setAttribute('data-drag-initialized', 'true');
    element.setAttribute('data-section-index', String(index));
    element.setAttribute('draggable', 'true');
    
    const tagName = element.tagName.toLowerCase();
    const className = Array.from(element.classList).find(c => 
      c && !c.startsWith('draggable') && !c.startsWith('drop') && c.length > 2
    ) || '';
    const dataSection = element.getAttribute('data-section');
    const sectionName = dataSection || className || tagName;
    
    const label = doc.createElement('div');
    label.className = 'section-label';
    label.textContent = sectionName.toUpperCase() + ' #' + index;
    element.insertBefore(label, element.firstChild);
    
    const handle = doc.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>';
    element.insertBefore(handle, element.firstChild);
    
    element.addEventListener('dragstart', (e: DragEvent) => {
      element.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }
    });
    
    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      doc.querySelectorAll('.drop-zone-indicator').forEach(el => el.classList.remove('drop-zone-indicator'));
    });
    
    element.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    
    element.addEventListener('dragenter', (e: DragEvent) => {
      e.preventDefault();
      const dragging = doc.querySelector('.dragging');
      if (dragging && dragging !== element) {
        element.classList.add('drop-zone-indicator');
      }
    });
    
    element.addEventListener('dragleave', (e: DragEvent) => {
      if (!element.contains(e.relatedTarget as Node)) {
        element.classList.remove('drop-zone-indicator');
      }
    });
    
    element.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drop-zone-indicator');
      
      const dragging = doc.querySelector('.dragging') as HTMLElement;
      if (dragging && dragging !== element) {
        const parent = element.parentNode;
        if (parent) {
          const allSections = Array.from(parent.querySelectorAll('.draggable-section'));
          const draggedIdx = allSections.indexOf(dragging);
          const targetIdx = allSections.indexOf(element);
          
          if (draggedIdx < targetIdx) {
            parent.insertBefore(dragging, element.nextSibling);
          } else {
            parent.insertBefore(dragging, element);
          }
          
          dragging.classList.add('just-dropped');
          setTimeout(() => dragging.classList.remove('just-dropped'), 300);
          
          const newOrder: string[] = [];
          parent.querySelectorAll('.draggable-section').forEach((s, i) => {
            const section = s as HTMLElement;
            section.setAttribute('data-section-index', String(i + 1));
            const labelEl = section.querySelector('.section-label');
            if (labelEl) {
              const currentText = labelEl.textContent || '';
              const baseName = currentText.replace(/#\d+$/, '').trim();
              labelEl.textContent = baseName + ' #' + (i + 1);
            }
            newOrder.push(section.outerHTML);
          });
          
          if (this.onReorderCallback) {
            this.onReorderCallback(newOrder);
          }
        }
      }
    });
  }

  reinitialize(): void {
    this.initialized = false;
    this.initializeIframeDragDrop();
  }

  destroyCanvas(_canvas: HTMLElement): void {
    this.cleanup();
  }

  onDragStart(element: unknown): void {
    this.draggedElement = element;
  }

  onDragEnd(): void {
    this.draggedElement = null;
  }

  getDraggedElement(): unknown {
    return this.draggedElement;
  }

  on(eventName: string, handler: DropHandler): void {
    this.handlers.set(eventName, handler);
    
    if (this.canvas && eventName === 'drop') {
      this.canvas.addEventListener('drop', handler as EventListener);
      this.canvas.addEventListener('dragover', this.handleDragOver);
    }
  }

  off(eventName: string, handler: DropHandler): void {
    if (this.canvas && eventName === 'drop') {
      this.canvas.removeEventListener('drop', handler as EventListener);
      this.canvas.removeEventListener('dragover', this.handleDragOver);
    }
    this.handlers.delete(eventName);
  }

  private handleDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  cleanup(): void {
    if (this.canvas) {
      this.handlers.forEach((handler, eventName) => {
        if (eventName === 'drop') {
          this.canvas?.removeEventListener('drop', handler as EventListener);
          this.canvas?.removeEventListener('dragover', this.handleDragOver);
        }
      });
    }
    this.handlers.clear();
    this.canvas = null;
    this.iframe = null;
    this.initialized = false;
  }
}

export const canvasDragDropService = new CanvasDragDropService();

export function getDragDropScript(): string {
  return `
    (function() {
      var draggedElement = null;
      
      function initDragDrop() {
        var selectors = ['section', '[data-section]', '.section', 'header', 'footer', 'nav', 'main > div', 'body > div:not(script):not(style)', 'article'];
        var sections = document.querySelectorAll(selectors.join(', '));
        var sectionIndex = 0;
        
        sections.forEach(function(section) {
          if (section.getAttribute('data-drag-initialized') === 'true') return;
          if (section.closest('.draggable-section') && section !== section.closest('.draggable-section')) return;
          if (section.offsetHeight < 50) return;
          
          sectionIndex++;
          makeDraggable(section, sectionIndex);
        });
        
        console.log('[DragDrop] Initialized ' + sectionIndex + ' sections');
      }
      
      function makeDraggable(element, index) {
        element.classList.add('draggable-section');
        element.setAttribute('data-drag-initialized', 'true');
        element.setAttribute('data-section-index', index);
        element.setAttribute('draggable', 'true');
        
        var tagName = element.tagName.toLowerCase();
        var classList = Array.from(element.classList);
        var className = classList.find(function(c) { return c && !c.startsWith('draggable') && !c.startsWith('drop') && c.length > 2; }) || '';
        var dataSection = element.getAttribute('data-section');
        var sectionName = dataSection || className || tagName;
        
        var label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = sectionName.toUpperCase() + ' #' + index;
        element.insertBefore(label, element.firstChild);
        
        var handle = document.createElement('div');
        handle.className = 'drag-handle';
        handle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>';
        element.insertBefore(handle, element.firstChild);
        
        element.addEventListener('dragstart', function(e) {
          draggedElement = element;
          element.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', index);
        });
        
        element.addEventListener('dragend', function() {
          element.classList.remove('dragging');
          document.querySelectorAll('.drop-zone-indicator').forEach(function(el) {
            el.classList.remove('drop-zone-indicator');
          });
          draggedElement = null;
        });
        
        element.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        
        element.addEventListener('dragenter', function(e) {
          e.preventDefault();
          var dragging = document.querySelector('.dragging');
          if (dragging && dragging !== element) {
            element.classList.add('drop-zone-indicator');
          }
        });
        
        element.addEventListener('dragleave', function(e) {
          if (!element.contains(e.relatedTarget)) {
            element.classList.remove('drop-zone-indicator');
          }
        });
        
        element.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          element.classList.remove('drop-zone-indicator');
          
          var dragging = document.querySelector('.dragging');
          if (dragging && dragging !== element) {
            var parent = element.parentNode;
            var allSections = Array.from(parent.querySelectorAll('.draggable-section'));
            var draggedIdx = allSections.indexOf(dragging);
            var targetIdx = allSections.indexOf(element);
            
            if (draggedIdx < targetIdx) {
              parent.insertBefore(dragging, element.nextSibling);
            } else {
              parent.insertBefore(dragging, element);
            }
            
            dragging.classList.add('just-dropped');
            setTimeout(function() { dragging.classList.remove('just-dropped'); }, 300);
            
            parent.querySelectorAll('.draggable-section').forEach(function(s, i) {
              s.setAttribute('data-section-index', i + 1);
              var labelEl = s.querySelector('.section-label');
              if (labelEl) {
                var currentText = labelEl.textContent || '';
                var baseName = currentText.replace(/#[0-9]+$/, '').trim();
                labelEl.textContent = baseName + ' #' + (i + 1);
              }
            });
            
            console.log('[DragDrop] Reordered from ' + (draggedIdx + 1) + ' to ' + (targetIdx + 1));
          }
        });
      }
      
      function startObserver() {
        if (!document.body) {
          setTimeout(startObserver, 50);
          return;
        }
        var observer = new MutationObserver(function(mutations) {
          var shouldReinit = false;
          mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
              mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && !node.getAttribute('data-drag-initialized')) {
                  shouldReinit = true;
                }
              });
            }
          });
          if (shouldReinit) setTimeout(initDragDrop, 100);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          initDragDrop();
          startObserver();
        });
      } else {
        initDragDrop();
        startObserver();
      }
    })();
  `;
}

export function getDragDropStyles(): string {
  return `
    .draggable-section {
      position: relative !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease, margin 0.2s ease !important;
    }
    
    .section-label {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      padding: 4px 12px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      border-radius: 0 0 8px 0 !important;
      z-index: 1000 !important;
      opacity: 0 !important;
      transition: opacity 0.2s ease !important;
      pointer-events: none !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3) !important;
    }
    
    .draggable-section:hover .section-label {
      opacity: 1 !important;
    }
    
    .drag-handle {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      width: 36px !important;
      height: 36px !important;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      border-radius: 8px !important;
      cursor: grab !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0 !important;
      transition: opacity 0.2s ease, transform 0.2s ease !important;
      z-index: 1001 !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4) !important;
    }
    
    .draggable-section:hover .drag-handle {
      opacity: 1 !important;
    }
    
    .drag-handle:hover {
      transform: scale(1.1) !important;
    }
    
    .drag-handle:active {
      cursor: grabbing !important;
      transform: scale(0.95) !important;
    }
    
    .drag-handle svg {
      width: 18px !important;
      height: 18px !important;
      color: white !important;
    }
    
    .draggable-section.dragging {
      opacity: 0.6 !important;
      transform: scale(1.02) rotate(1deg) !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      z-index: 10000 !important;
    }
    
    .draggable-section.dragging .section-label {
      opacity: 1 !important;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
    }
    
    .drop-zone-indicator {
      position: relative !important;
    }
    
    .drop-zone-indicator::before {
      content: '' !important;
      position: absolute !important;
      top: -4px !important;
      left: 0 !important;
      right: 0 !important;
      height: 4px !important;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6) !important;
      background-size: 200% 100% !important;
      animation: shimmer 1.5s infinite !important;
      border-radius: 2px !important;
      z-index: 9999 !important;
    }
    
    .drop-zone-indicator::after {
      content: 'Drop here' !important;
      position: absolute !important;
      top: -28px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: #3b82f6 !important;
      color: white !important;
      padding: 4px 12px !important;
      border-radius: 4px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      white-space: nowrap !important;
      z-index: 10000 !important;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4) !important;
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .draggable-section:hover {
      outline: 2px dashed #3b82f6 !important;
      outline-offset: 2px !important;
    }
    
    .draggable-section.dragging:hover {
      outline: none !important;
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .draggable-section.just-dropped {
      animation: slideIn 0.3s ease !important;
    }
  `;
}
