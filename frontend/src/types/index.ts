export type ShaderStage = 'vertex' | 'fragment' | 'link';

export interface ShaderError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  stage: ShaderStage;
}

export interface CompileResult {
  success: boolean;
  errors: ShaderError[];
}

export type SSEEventType =
  | 'thinking'
  | 'shader_code'
  | 'validation'
  | 'repair_start'
  | 'repair_attempt'
  | 'error'
  | 'done';

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ShaderError[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface SessionSummary {
  conversation_id: string;
  created_at: number;
  updated_at: number;
  title: string;
  message_count: number;
  current_shader: boolean;
}

export interface SessionData {
  conversation_id: string;
  created_at: number;
  updated_at: number;
  title: string;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  current_shader: string | null;
  agent_runs: string[];
}
