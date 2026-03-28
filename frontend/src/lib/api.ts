import type { Event, SupplyChain, ScenarioResult, RiskBrief } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/api/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function getEvent(id: string): Promise<Event> {
  const res = await fetch(`${API_BASE}/api/events/${id}`);
  if (!res.ok) throw new Error('Failed to fetch event');
  return res.json();
}

export async function getSupplyChains(): Promise<SupplyChain[]> {
  const res = await fetch(`${API_BASE}/api/supply-chains`);
  if (!res.ok) throw new Error('Failed to fetch supply chains');
  return res.json();
}

export async function simulateScenario(scenarioInput: string, chainId: string): Promise<ScenarioResult> {
  const res = await fetch(`${API_BASE}/api/simulate-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_input: scenarioInput, chain_id: chainId }),
  });
  if (!res.ok) throw new Error('Failed to simulate scenario');
  return res.json();
}

export async function generateBrief(chainId: string, scenarioId?: string): Promise<RiskBrief> {
  const res = await fetch(`${API_BASE}/api/generate-brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chain_id: chainId, scenario_id: scenarioId }),
  });
  if (!res.ok) throw new Error('Failed to generate brief');
  return res.json();
}
