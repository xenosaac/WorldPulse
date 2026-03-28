export interface Event {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_sectors: string[] | null;
  source_type: 'news' | 'video' | 'social' | 'data';
  source_url: string | null;
  confidence: number | null;
  evidence: string | null;
  video_timestamp: number | null;
  extracted_at: string | null;
}

export interface SupplyChainNode {
  id: string;
  chain_id: string;
  name: string;
  role: string;
  lat: number;
  lng: number;
  country: string | null;
  risk_level: string;
  sort_order: number;
}

export interface SupplyChain {
  id: string;
  name: string;
  description: string | null;
  nodes: SupplyChainNode[];
}

export interface ScenarioResult {
  id: string;
  scenario_input: string;
  chain_id: string;
  impact_chain: Record<string, unknown>[];
  overall_risk: string;
  source: 'text' | 'voice';
  created_at: string;
}

export interface RiskBrief {
  id: string;
  chain_id: string;
  scenario_id: string | null;
  executive_summary: string;
  risk_matrix: Record<string, unknown>[];
  recommendations: string;
  full_report: string;
  created_at: string;
}

// WebSocket message types for voice Live API
export type WSMessage =
  | { type: 'audio'; data: string }           // base64 audio chunk
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'transcript'; text: string }
  | { type: 'session'; status: string; message?: string };
