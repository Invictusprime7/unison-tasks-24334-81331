import type { LayoutConstraints, TemplateComponent, TemplateSection } from '@/types/template';

export class LayoutEngine {
  /**
   * Apply layout constraints to calculate positions and sizes
   */
  applyLayout(section: TemplateSection): LayoutResult {
    const rootWidth = this.calculateDimension(section.constraints.width, 0, 'width');
    const rootHeight = this.calculateDimension(section.constraints.height, 0, 'height');
    
    const componentLayouts: ComponentLayout[] = [];
    
    // Calculate layout for each component
    let currentX = section.constraints.padding?.left || 0;
    let currentY = section.constraints.padding?.top || 0;
    const gap = section.constraints.gap || 0;
    
    section.components.forEach((component, index) => {
      const layout = this.calculateComponentLayout(
        component,
        currentX,
        currentY,
        rootWidth,
        rootHeight,
        section.constraints
      );
      
      componentLayouts.push(layout);
      
      // Update position for next component based on flex direction
      if (section.constraints.flexDirection === 'row') {
        currentX = layout.x + layout.width + gap;
      } else {
        currentY = layout.y + layout.height + gap;
      }
    });

    return {
      width: rootWidth,
      height: rootHeight,
      components: componentLayouts,
    };
  }

  private calculateComponentLayout(
    component: TemplateComponent,
    startX: number,
    startY: number,
    parentWidth: number,
    parentHeight: number,
    parentConstraints: LayoutConstraints
  ): ComponentLayout {
    const width = this.calculateDimension(component.constraints.width, parentWidth, 'width');
    const height = this.calculateDimension(component.constraints.height, parentHeight, 'height');
    
    let x = startX + (component.constraints.margin?.left || 0);
    let y = startY + (component.constraints.margin?.top || 0);
    
    // Apply alignment
    if (parentConstraints.alignItems === 'center') {
      if (parentConstraints.flexDirection === 'column') {
        x = (parentWidth - width) / 2;
      } else {
        y = (parentHeight - height) / 2;
      }
    } else if (parentConstraints.alignItems === 'flex-end') {
      if (parentConstraints.flexDirection === 'column') {
        x = parentWidth - width;
      } else {
        y = parentHeight - height;
      }
    }
    
    return {
      id: component.id,
      x,
      y,
      width,
      height,
    };
  }

  private calculateDimension(
    constraint: { mode: string; value?: number },
    parentSize: number,
    dimension: 'width' | 'height'
  ): number {
    switch (constraint.mode) {
      case 'fixed':
        return constraint.value || 100;
      
      case 'fill':
        return parentSize;
      
      case 'hug':
        // For hug content, use a default size or value if provided
        return constraint.value || (dimension === 'width' ? 200 : 100);
      
      default:
        return constraint.value || 100;
    }
  }
}

export interface ComponentLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  components: ComponentLayout[];
}
