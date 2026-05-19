export interface ProviderCapability {
  name: string;
  version: string;
  description?: string;
}

export interface ProviderExtension {
  providerId: string;
  providerVersion: string;
  capabilities: ProviderCapability[];
  metadata?: Record<string, string>;
}

export function matchCapability(
  extension: ProviderExtension,
  capabilityName: string
): ProviderCapability | null {
  return extension.capabilities.find(
    (cap) => cap.name === capabilityName
  ) ?? null;
}

export function listCapabilityNames(extension: ProviderExtension): string[] {
  return extension.capabilities.map((cap) => cap.name);
}
