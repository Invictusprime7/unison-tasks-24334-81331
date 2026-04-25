import {
  inferPageRoleFromType,
  type BuilderPage,
  type BuilderRouteState,
} from '@/types/pageRegistry';
import type {
  PlaygroundBinding,
  PlaygroundBusinessSetupSection,
  PlaygroundControlPlaneFunnel,
  PlaygroundControlPlaneFunnelStep,
  PlaygroundControlPlaneModel,
  PlaygroundControlPlanePage,
  PlaygroundIntentDependency,
  PlaygroundLaunchTask,
  PlaygroundLaunchTaskCategory,
  PlaygroundReadinessStatus,
  PlaygroundResolverSection,
  PlaygroundSetupField,
  PlaygroundSetupSnapshot,
  PlaygroundState,
  PlaygroundValidation,
} from '@/types/playground';
import { buildIntentReadinessReport } from '@/services/intentReadinessService';
import { getValidationSummary, validatePlayground } from '@/services/playgroundValidationService';

interface ResolvePlaygroundControlPlaneOptions {
  state: PlaygroundState;
  setupSnapshot?: PlaygroundSetupSnapshot;
  validations?: PlaygroundValidation[];
  vfsFiles?: Record<string, string>;
}

const FIELD_LABELS: Record<PlaygroundSetupField, string> = {
  businessName: 'Business Name',
  email: 'Primary Email',
  phone: 'Phone Number',
  address: 'Address',
  notificationEmail: 'Notification Email',
  bookingOwner: 'Booking Owner',
  paymentProvider: 'Payment Provider',
  crmDestination: 'CRM Destination',
  publishDomain: 'Publish Domain',
  followUpChannel: 'Follow-up Channel',
};

const SECTION_LABELS: Record<PlaygroundResolverSection, string> = {
  business: 'Business Setup',
  launch: 'Launch Wizard',
  forms: 'Forms',
  calendars: 'Calendars',
  products: 'Products',
  popups: 'Popups',
  pages: 'Pages',
  components: 'Components',
};

const STEP_LABELS: Record<string, string> = {
  booking_calendar: 'Set Up Booking Calendar',
  notifications: 'Configure Notifications',
  payments: 'Connect Payment Processing',
  database: 'Connect Database',
  domain: 'Connect Custom Domain',
  seo: 'Review SEO Setup',
  analytics: 'Configure Analytics',
};

function mergeStatus(
  current: PlaygroundReadinessStatus,
  next: PlaygroundReadinessStatus,
): PlaygroundReadinessStatus {
  if (current === 'blocked' || next === 'blocked') return 'blocked';
  if (current === 'partial' || next === 'partial') return 'partial';
  return 'ready';
}

function getRouteStateForPage(
  page: BuilderPage,
  routeIssues: PlaygroundValidation[],
): BuilderRouteState {
  const hasError = routeIssues.some((issue) => issue.severity === 'error');
  const hasWarning = routeIssues.some((issue) => issue.severity === 'warning');
  if (page.previewError || hasError) return 'preview_error';
  if (hasWarning) return page.routeState === 'published' ? 'published' : 'rendering';
  if (page.routeState) return page.routeState;
  return 'generated';
}

function normalizePreviewStatus(
  page: BuilderPage,
  previewStatus: PlaygroundReadinessStatus,
  routeState: BuilderRouteState,
): PlaygroundReadinessStatus {
  if (routeState === 'preview_error') return 'blocked';
  if (routeState === 'rendering') return mergeStatus(previewStatus, 'partial');
  if (page.previewError) return 'blocked';
  return previewStatus;
}

function normalizePublishStatus(
  page: BuilderPage,
  publishStatus: PlaygroundReadinessStatus,
): PlaygroundReadinessStatus {
  if (page.publishedStatus === 'stale') return mergeStatus(publishStatus, 'partial');
  return publishStatus;
}

function getPageBindingSet(
  pageId: string,
  bindings: PlaygroundBinding[],
): PlaygroundBinding[] {
  return bindings.filter(
    (binding) => binding.sourcePageId === pageId || (binding.targetType === 'page' && binding.targetId === pageId),
  );
}

function getPageFunnelRoles(state: PlaygroundState, pageId: string) {
  const roles = new Set<BuilderPage['funnelRole']>();
  for (const funnel of Object.values(state.pageRegistry.funnels)) {
    for (const step of funnel.steps) {
      if (step.pageId === pageId) roles.add(step.role);
    }
  }
  return Array.from(roles).filter(Boolean) as NonNullable<BuilderPage['funnelRole']>[];
}

function getPageSetupStatus(
  page: BuilderPage,
  publishStatus: PlaygroundReadinessStatus,
  boundIntentCount: number,
): BuilderPage['setupStatus'] {
  if (page.setupStatus && page.setupStatus !== 'not_started') return page.setupStatus;
  if (publishStatus === 'ready') return 'ready';
  if (boundIntentCount > 0 || publishStatus === 'partial') return 'partial';
  return 'not_started';
}

function buildPagesModel(
  state: PlaygroundState,
  validations: PlaygroundValidation[],
  bindings: PlaygroundBinding[],
): PlaygroundControlPlanePage[] {
  const pages = Object.values(state.pageRegistry.pages)
    .sort((a, b) => a.navOrder - b.navOrder || a.title.localeCompare(b.title));

  return pages.map((page) => {
    const relatedBindings = getPageBindingSet(page.pageId, bindings);
    const routeIssues = validations.filter(
      (validation) =>
        validation.targetId === page.pageId &&
        (validation.scope === 'router' || validation.scope === 'pages'),
    );
    const previewStatus = relatedBindings.reduce<PlaygroundReadinessStatus>(
      (status, binding) => mergeStatus(status, binding.previewStatus || 'ready'),
      'ready',
    );
    const publishStatus = relatedBindings.reduce<PlaygroundReadinessStatus>(
      (status, binding) => mergeStatus(status, binding.publishStatus || 'ready'),
      'ready',
    );
    const routeState = getRouteStateForPage(page, routeIssues);
    const normalizedPreviewStatus = normalizePreviewStatus(page, previewStatus, routeState);
    const normalizedPublishStatus = normalizePublishStatus(page, publishStatus);
    const funnelIds = Array.from(
      new Set([
        ...(page.funnelIds || []),
        ...(page.funnelId ? [page.funnelId] : []),
      ]),
    );

    return {
      pageId: page.pageId,
      title: page.title,
      path: page.path,
      pageType: page.pageType,
      pageRole: page.pageRole || inferPageRoleFromType(page.pageType),
      routeState,
      publishedStatus: page.publishedStatus || 'unpublished',
      setupStatus: getPageSetupStatus(page, normalizedPublishStatus, relatedBindings.length),
      previewStatus: normalizedPreviewStatus,
      publishStatus: normalizedPublishStatus,
      previewThumbnailUrl: page.previewThumbnailUrl,
      previewLastSyncedAt: page.previewLastSyncedAt,
      previewError: page.previewError,
      navKey: page.path === '/' ? 'home' : page.path.replace(/^\//, '').replace(/\//g, '.'),
      isHome: page.isHome,
      showInNav: page.showInNav,
      funnelIds,
      funnelNames: funnelIds
        .map((funnelId) => state.pageRegistry.funnels[funnelId]?.name)
        .filter(Boolean) as string[],
      funnelRoles: getPageFunnelRoles(state, page.pageId),
      routeIssues,
      boundIntentCount: relatedBindings.length,
    };
  });
}

function buildFunnelsModel(
  state: PlaygroundState,
  pages: PlaygroundControlPlanePage[],
): PlaygroundControlPlaneFunnel[] {
  const pagesById = new Map(pages.map((page) => [page.pageId, page]));

  return Object.values(state.pageRegistry.funnels)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((funnel) => {
      const steps: PlaygroundControlPlaneFunnelStep[] = funnel.steps
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((step) => {
          const page = pagesById.get(step.pageId);
          return {
            stepId: step.stepId,
            pageId: step.pageId,
            title: page?.title || step.pageId,
            path: page?.path || '',
            role: step.role,
            routeState: page?.routeState || 'draft',
            previewStatus: page?.previewStatus || 'blocked',
            publishStatus: page?.publishStatus || 'blocked',
            previewThumbnailUrl: page?.previewThumbnailUrl,
            boundIntentCount: page?.boundIntentCount || 0,
          };
        });

      const previewStatus = steps.reduce<PlaygroundReadinessStatus>(
        (status, step) => mergeStatus(status, step.previewStatus),
        'ready',
      );
      const publishStatus = steps.reduce<PlaygroundReadinessStatus>(
        (status, step) => mergeStatus(status, step.publishStatus),
        'ready',
      );
      const missingDependencies = steps
        .filter((step) => step.publishStatus !== 'ready')
        .map((step) => `${step.title} (${step.role})`);

      return {
        funnelId: funnel.funnelId,
        name: funnel.name,
        funnelType: funnel.funnelType || 'custom',
        previewStatus,
        publishStatus,
        steps,
        missingDependencies,
      };
    });
}

function getLaunchTaskCategory(
  dependency: PlaygroundIntentDependency,
): PlaygroundLaunchTaskCategory {
  if (dependency.mode === 'publish' && dependency.status === 'blocked') {
    return dependency.resolverStepId === 'domain' || dependency.resolverStepId === 'seo' || dependency.resolverStepId === 'analytics'
      ? 'growth'
      : 'required_for_publish';
  }
  if (dependency.mode === 'publish') return 'recommended_first';
  return 'optional';
}

function labelForDependency(dependency: PlaygroundIntentDependency): string {
  if (dependency.resolverStepId) return STEP_LABELS[dependency.resolverStepId] || dependency.label;
  if (dependency.resolverField) return FIELD_LABELS[dependency.resolverField] || dependency.label;
  if (dependency.resolverSection) return SECTION_LABELS[dependency.resolverSection] || dependency.label;
  return dependency.label;
}

function descriptionForDependency(dependency: PlaygroundIntentDependency): string {
  return dependency.fixHint || dependency.message;
}

function buildLaunchTasks(
  dependencies: PlaygroundIntentDependency[],
): PlaygroundLaunchTask[] {
  const grouped = new Map<string, PlaygroundLaunchTask>();

  for (const dependency of dependencies.filter((item) => item.status !== 'ready')) {
    const key = [
      dependency.resolverSection || 'unknown',
      dependency.resolverField || '',
      dependency.resolverStepId || '',
      dependency.label,
    ].join(':');
    const category = getLaunchTaskCategory(dependency);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        label: labelForDependency(dependency),
        description: descriptionForDependency(dependency),
        category,
        blockedCount: dependency.status === 'blocked' ? 1 : 0,
        relatedCount: 1,
        resolverSection: dependency.resolverSection,
        resolverField: dependency.resolverField,
        resolverStepId: dependency.resolverStepId,
      });
      continue;
    }

    const task = grouped.get(key)!;
    task.relatedCount += 1;
    if (dependency.status === 'blocked') task.blockedCount += 1;
    if (category === 'required_for_publish' || category === 'growth') {
      task.category = category;
    } else if (task.category !== 'required_for_publish' && task.category !== 'growth') {
      task.category = category;
    }
  }

  const categoryRank: Record<PlaygroundLaunchTaskCategory, number> = {
    required_for_publish: 0,
    recommended_first: 1,
    optional: 2,
    growth: 3,
  };

  return Array.from(grouped.values()).sort((a, b) => {
    const categoryDelta = categoryRank[a.category] - categoryRank[b.category];
    if (categoryDelta !== 0) return categoryDelta;
    if (a.blockedCount !== b.blockedCount) return b.blockedCount - a.blockedCount;
    return a.label.localeCompare(b.label);
  });
}

function isBlank(value: unknown) {
  return value == null || (typeof value === 'string' && value.trim().length === 0);
}

function buildBusinessSetupSections(
  state: PlaygroundState,
  setupSnapshot: PlaygroundSetupSnapshot,
): PlaygroundBusinessSetupSection[] {
  const info = state.creatorData.businessInfo;
  const groups: Array<{
    id: string;
    label: string;
    fields: PlaygroundSetupField[];
    getValue: (field: PlaygroundSetupField) => unknown;
  }> = [
    {
      id: 'identity',
      label: 'Identity',
      fields: ['businessName', 'email', 'phone', 'address'],
      getValue: (field) => info[field],
    },
    {
      id: 'operations',
      label: 'Operations',
      fields: ['notificationEmail', 'bookingOwner', 'paymentProvider', 'crmDestination', 'followUpChannel'],
      getValue: (field) => info[field] || (field === 'notificationEmail' ? setupSnapshot.notificationEmail : null),
    },
    {
      id: 'publish',
      label: 'Publish',
      fields: ['publishDomain'],
      getValue: (field) => info[field] || setupSnapshot.customDomain,
    },
  ];

  return groups.map((group) => {
    const missingFields = group.fields.filter((field) => isBlank(group.getValue(field)));
    return {
      id: group.id,
      label: group.label,
      status: missingFields.length === 0 ? 'ready' : missingFields.length === group.fields.length ? 'blocked' : 'partial',
      fields: group.fields,
      missingFields,
    };
  });
}

export function resolvePlaygroundControlPlane(
  options: ResolvePlaygroundControlPlaneOptions,
): PlaygroundControlPlaneModel {
  const validations = options.validations || validatePlayground(options.state, options.vfsFiles || {});
  const validationSummary = getValidationSummary(validations);
  const readinessReport = buildIntentReadinessReport(
    options.state,
    validations,
    options.setupSnapshot || {},
  );
  const intentRegistry = Object.values(readinessReport.bindings).sort((a, b) => {
    const aStatus = readinessReport.readiness[a.bindingId]?.publishStatus || 'ready';
    const bStatus = readinessReport.readiness[b.bindingId]?.publishStatus || 'ready';
    if (aStatus !== bStatus) {
      const rank: Record<PlaygroundReadinessStatus, number> = { blocked: 0, partial: 1, ready: 2 };
      return rank[aStatus] - rank[bStatus];
    }
    return (a.elementKey || a.bindingId).localeCompare(b.elementKey || b.bindingId);
  });

  const pages = buildPagesModel(options.state, validations, intentRegistry).map((page) => {
    const sourcePageBindings = intentRegistry.filter((binding) => binding.sourcePageId === page.pageId);
    return {
      ...page,
      setupStatus: getPageSetupStatus(
        options.state.pageRegistry.pages[page.pageId],
        page.publishStatus,
        sourcePageBindings.length,
      ),
    };
  });

  const funnels = buildFunnelsModel(options.state, pages);
  const dependencies = [
    ...Object.values(readinessReport.readiness).flatMap((item) => item.dependencies),
    ...Object.values(readinessReport.componentReadiness).flatMap((item) => item.dependencies),
  ];
  const launchTasks = buildLaunchTasks(dependencies);
  const businessSetupSections = buildBusinessSetupSections(options.state, options.setupSnapshot || {});

  return {
    state: options.state,
    validations,
    validationSummary,
    readinessReport,
    pages,
    funnels,
    intentRegistry,
    launchTasks,
    businessSetupSections,
    overview: {
      totalPages: pages.length,
      totalFunnels: funnels.length,
      totalIntents: intentRegistry.length,
      previewReadyPages: pages.filter((page) => page.previewStatus === 'ready').length,
      publishReadyPages: pages.filter((page) => page.publishStatus === 'ready').length,
      blockedPages: pages.filter((page) => page.publishStatus === 'blocked').length,
      blockedFunnels: funnels.filter((funnel) => funnel.publishStatus === 'blocked').length,
      blockedLaunchTasks: launchTasks.filter((task) => task.category === 'required_for_publish' && task.blockedCount > 0).length,
    },
  };
}
