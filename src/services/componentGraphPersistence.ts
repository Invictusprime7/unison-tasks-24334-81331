import { supabase } from "@/integrations/supabase/client";
import type { CreatorComponentInstance } from "@/types/creatorData";

type CanonicalPlaygroundPayload = {
  creatorData?: {
    componentInstances?: Record<
      string,
      {
        instanceId: string;
        componentType: string;
        componentSlug?: string;
        label?: string;
        bindings?: Record<string, string>;
        props?: Record<string, unknown>;
        usedOnPages?: string[];
        requiredCapabilities?: string[];
        outputEvents?: string[];
        status?: string;
      }
    >;
  };
};

let componentGraphTablesUnsupported = false;
let projectEventLogUnsupported = false;

function isMissingRelationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /relation .* does not exist|column .* does not exist|schema cache|Could not find the table|Could not find the '.*' column/i.test(message);
}

function inferTargetKind(bindingKey: string) {
  if (bindingKey === "formId") return "form";
  if (bindingKey === "calendarId") return "calendar";
  if (bindingKey === "productId") return "product";
  if (bindingKey === "checkoutId") return "checkout";
  return "reference";
}

export async function syncCanonicalComponentGraph({
  projectId,
  draftId,
  canonicalPlayground,
}: {
  projectId?: string | null;
  draftId?: string | null;
  canonicalPlayground?: Record<string, unknown>;
}) {
  if (!projectId || componentGraphTablesUnsupported) {
    return false;
  }

  const typedPayload = (canonicalPlayground || {}) as CanonicalPlaygroundPayload;
  const componentInstances = Object.values(
    typedPayload.creatorData?.componentInstances || {},
  );

  try {
    const { error: deleteBindingsError } = await supabase
      .from("project_component_bindings" as any)
      .delete()
      .eq("project_id", projectId);
    if (deleteBindingsError) throw deleteBindingsError;

    const { error: deleteInstancesError } = await supabase
      .from("project_component_instances" as any)
      .delete()
      .eq("project_id", projectId);
    if (deleteInstancesError) throw deleteInstancesError;

    if (componentInstances.length === 0) {
      return true;
    }

    const instanceRows = componentInstances.map((instance) => ({
      project_id: projectId,
      builder_draft_id: draftId ?? null,
      source_instance_id: instance.instanceId,
      definition_slug: instance.componentSlug || null,
      component_type: instance.componentType,
      label: instance.label || instance.componentType,
      status: instance.status || "draft",
      source: "builder",
      page_ids: instance.usedOnPages || [],
      bindings: instance.bindings || {},
      props: instance.props || {},
      required_capabilities: instance.requiredCapabilities || [],
      output_events: instance.outputEvents || [],
    }));

    const { data: insertedInstances, error: insertInstancesError } = await supabase
      .from("project_component_instances" as any)
      .insert(instanceRows)
      .select("id, source_instance_id");
    if (insertInstancesError) throw insertInstancesError;

    const instanceIdBySourceId = new Map<string, string>(
      (insertedInstances || [])
        .filter((row: any) => row?.id && row?.source_instance_id)
        .map((row: any) => [String(row.source_instance_id), String(row.id)]),
    );

    const bindingRows = componentInstances.flatMap((instance) => {
      const persistedInstanceId = instanceIdBySourceId.get(instance.instanceId);
      if (!persistedInstanceId) return [];

      return Object.entries(instance.bindings || {}).map(([bindingKey, targetRef]) => ({
        project_id: projectId,
        component_instance_id: persistedInstanceId,
        binding_key: bindingKey,
        target_kind: inferTargetKind(bindingKey),
        target_ref: targetRef,
        config: {},
      }));
    });

    if (bindingRows.length > 0) {
      const { error: insertBindingsError } = await supabase
        .from("project_component_bindings" as any)
        .insert(bindingRows);
      if (insertBindingsError) throw insertBindingsError;
    }

    return true;
  } catch (error) {
    if (isMissingRelationError(error)) {
      componentGraphTablesUnsupported = true;
      console.warn("[componentGraphPersistence] Component graph tables are not available yet. Apply the canonical component graph migration.");
      return false;
    }

    console.warn("[componentGraphPersistence] Failed to sync canonical component graph:", error);
    return false;
  }
}

export async function loadCanonicalComponentGraph(projectId?: string | null) {
  if (!projectId || componentGraphTablesUnsupported) {
    return null;
  }

  try {
    const [{ data: instances, error: instancesError }, { data: bindings, error: bindingsError }] = await Promise.all([
      supabase
        .from("project_component_instances" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_component_bindings" as any)
        .select("*")
        .eq("project_id", projectId),
    ]);

    if (instancesError) throw instancesError;
    if (bindingsError) throw bindingsError;

    const bindingsByInstanceId = new Map<string, Record<string, string>>();
    for (const row of bindings || []) {
      const instanceId = String(row.component_instance_id || "");
      if (!instanceId) continue;
      const bindingMap = bindingsByInstanceId.get(instanceId) || {};
      bindingMap[String(row.binding_key)] = String(row.target_ref);
      bindingsByInstanceId.set(instanceId, bindingMap);
    }

    const componentInstances: Record<string, CreatorComponentInstance> = {};
    for (const row of instances || []) {
      const sourceInstanceId = String(row.source_instance_id || row.id || "");
      if (!sourceInstanceId) continue;

      componentInstances[sourceInstanceId] = {
        instanceId: sourceInstanceId,
        componentType: String(row.component_type || "component"),
        componentSlug: typeof row.definition_slug === "string" ? row.definition_slug : undefined,
        label: String(row.label || row.component_type || "Component"),
        bindings: {
          ...((row.bindings as Record<string, string> | null) || {}),
          ...(bindingsByInstanceId.get(String(row.id)) || {}),
        },
        props: (row.props as Record<string, unknown> | null) || {},
        usedOnPages: Array.isArray(row.page_ids) ? row.page_ids.map(String) : [],
        requiredCapabilities: Array.isArray(row.required_capabilities)
          ? row.required_capabilities.map(String)
          : undefined,
        outputEvents: Array.isArray(row.output_events) ? row.output_events.map(String) : undefined,
        status: typeof row.status === "string"
          ? (row.status as CreatorComponentInstance["status"])
          : "draft",
      };
    }

    return componentInstances;
  } catch (error) {
    if (isMissingRelationError(error)) {
      componentGraphTablesUnsupported = true;
      console.warn("[componentGraphPersistence] Component graph tables are not available yet. Apply the canonical component graph migration.");
      return null;
    }

    console.warn("[componentGraphPersistence] Failed to load canonical component graph:", error);
    return null;
  }
}

export async function logProjectGraphEvents({
  projectId,
  events,
  payload = {},
  componentInstanceId,
  pageId,
  source = "runtime",
}: {
  projectId?: string | null;
  events?: Array<{ name: string; payload?: Record<string, unknown> }>;
  payload?: Record<string, unknown>;
  componentInstanceId?: string | null;
  pageId?: string | null;
  source?: string;
}) {
  if (!projectId || !events?.length || projectEventLogUnsupported) {
    return false;
  }

  try {
    const rows = events.map((event) => ({
      project_id: projectId,
      component_instance_id: componentInstanceId ?? null,
      page_id: pageId ?? null,
      event_name: event.name,
      source,
      payload: {
        ...payload,
        ...(event.payload || {}),
      },
    }));

    const { error } = await supabase
      .from("project_event_log" as any)
      .insert(rows);

    if (error) throw error;
    return true;
  } catch (error) {
    if (isMissingRelationError(error)) {
      projectEventLogUnsupported = true;
      console.warn("[componentGraphPersistence] Project event log table is not available yet. Apply the canonical component graph migration.");
      return false;
    }

    console.warn("[componentGraphPersistence] Failed to record project graph events:", error);
    return false;
  }
}
