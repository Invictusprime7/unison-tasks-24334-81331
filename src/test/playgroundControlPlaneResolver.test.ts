import { describe, expect, it } from 'vitest';
import { createEmptyCreatorData } from '@/types/creatorData';
import {
  createBuilderPage,
  createEmptyPageRegistry,
  createFunnelGraph,
  type FunnelStep,
} from '@/types/pageRegistry';
import type { PlaygroundState } from '@/types/playground';
import { resolvePlaygroundControlPlane } from '@/services/playgroundControlPlaneResolver';

function createState(): PlaygroundState {
  const creatorData = createEmptyCreatorData('Acme Co');
  const pageRegistry = createEmptyPageRegistry();

  const homePage = createBuilderPage('page_home', 'Home', '/', 'home', {
    isHome: true,
    filePath: '/src/pages/Home.tsx',
    routeState: 'preview_ready',
  });
  const contactPage = createBuilderPage('page_contact', 'Contact', '/contact', 'contact', {
    filePath: '/src/pages/Contact.tsx',
    routeState: 'generated',
  });

  pageRegistry.pages[homePage.pageId] = homePage;
  pageRegistry.pages[contactPage.pageId] = contactPage;
  pageRegistry.homePageId = homePage.pageId;

  const steps: FunnelStep[] = [
    {
      stepId: 'step_home',
      pageId: homePage.pageId,
      role: 'entry',
      nextStepId: 'step_contact',
      sortOrder: 0,
    },
    {
      stepId: 'step_contact',
      pageId: contactPage.pageId,
      role: 'offer',
      nextStepId: null,
      sortOrder: 1,
    },
  ];

  pageRegistry.funnels.funnel_1 = createFunnelGraph('funnel_1', 'Lead Funnel', steps, {
    funnelType: 'lead',
  });

  creatorData.forms.form_1 = {
    formId: 'form_1',
    name: 'Contact Form',
    fields: [
      {
        fieldId: 'field_1',
        label: 'Email',
        type: 'email',
        required: true,
        sortOrder: 0,
      },
    ],
    submitLabel: 'Send',
    successMessage: 'Thanks',
    sortOrder: 0,
  };

  return {
    creatorData,
    pageRegistry,
    calendars: {},
    popups: {},
    bindings: {
      bind_1: {
        bindingId: 'bind_1',
        sourcePageId: homePage.pageId,
        sourceLabel: 'Get Started',
        intent: 'form.open',
        targetId: 'form_1',
        targetType: 'form',
        confidence: 0.95,
        source: 'wizard',
        isValid: true,
        coreIntent: 'contact.submit',
        readiness: 'preview-ready',
      },
    },
  };
}

describe('resolvePlaygroundControlPlane', () => {
  it('builds shared page, funnel, and launch-task views from one state model', () => {
    const controlPlane = resolvePlaygroundControlPlane({
      state: createState(),
      vfsFiles: {
        '/src/App.tsx': 'export default function App(){ return null; }',
      },
    });

    expect(controlPlane.overview.totalPages).toBe(2);
    expect(controlPlane.pages.find((page) => page.pageId === 'page_home')?.boundIntentCount).toBe(1);
    expect(controlPlane.pages.find((page) => page.pageId === 'page_contact')?.routeIssues.length).toBeGreaterThan(0);
    expect(controlPlane.funnels[0]?.funnelType).toBe('lead');
    expect(controlPlane.funnels[0]?.steps).toHaveLength(2);
    expect(controlPlane.launchTasks.some((task) => task.resolverField === 'notificationEmail')).toBe(true);
    expect(controlPlane.intentRegistry).toHaveLength(1);
  });
});
