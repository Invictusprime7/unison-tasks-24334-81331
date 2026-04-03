export interface ComponentDefinition {
  id: string;
  name: string;
  rootJson: unknown; // fabric JSON of the component root/group
  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentInstance {
  id: string;
  componentId: string;
  overrides?: Record<string, unknown>;
}
