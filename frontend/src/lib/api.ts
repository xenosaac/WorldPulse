import type { Event, SupplyChain, ScenarioResult, RiskBrief, APIError } from './types';

export async function getEvents(): Promise<Event[]> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function getEvent(id: string): Promise<Event> {
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) throw new Error('Failed to fetch event');
  return res.json();
}

export async function getSupplyChains(): Promise<SupplyChain[]> {
  const res = await fetch('/api/supply-chains');
  if (!res.ok) throw new Error('Failed to fetch supply chains');
  return res.json();
}

export async function simulateScenario(scenarioInput: string, chainId: string): Promise<ScenarioResult> {
  const res = await fetch('/api/simulate-scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_input: scenarioInput, chain_id: chainId }),
  });
  if (!res.ok) throw new Error('Failed to simulate scenario');
  return res.json();
}

export async function generateBrief(chainId: string, scenarioId?: string): Promise<RiskBrief> {
  const res = await fetch('/api/generate-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chain_id: chainId, scenario_id: scenarioId }),
  });
  if (!res.ok) throw new Error('Failed to generate brief');
  return res.json();
}

export async function analyzeVideo(source: string): Promise<{ events: Event[] }> {
  const isUrl = source.startsWith('http://') || source.startsWith('https://');
  const res = await fetch('/api/analyze-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isUrl ? { url: source } : { file_uri: source }),
  });
  if (!res.ok) throw new Error('Failed to analyze video');
  return res.json();
}

export async function getScenario(id: string): Promise<ScenarioResult> {
  const res = await fetch(`/api/scenarios/${id}`);
  if (!res.ok) throw new Error('Failed to fetch scenario');
  return res.json();
}

export async function getBrief(id: string): Promise<RiskBrief> {
  const res = await fetch(`/api/briefs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch brief');
  return res.json();
}

export async function addSupplyChainNode(chainId: string, name: string): Promise<any> {
  const res = await fetch(`/api/supply-chains/${chainId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to add node');
  return res.json();
}

export async function deleteSupplyChainNode(nodeId: string): Promise<void> {
  const res = await fetch(`/api/supply-chains/nodes/${nodeId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete node');
}

export function getWebSocketUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}
