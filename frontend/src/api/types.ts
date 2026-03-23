export interface AnalysisRequest {
  url: string;
  openai_key: string;
  serper_key: string;
  google_key?: string;
  anthropic_key?: string;
  perplexity_key?: string;
  n_competitors: number;
  n_questions: number;
  custom_questions?: string[];
}

export interface BusinessProfile {
  business_name: string;
  industry: string;
  location: string;
  target_audience: string;
  products_services: string[];
  unique_value_prop: string;
  search_query: string;
}

export interface EvalResult {
  question: string;
  answer: string;
  business_mentioned: boolean;
  visibility_score: number;
  mention_quality: 'prominent' | 'brief' | 'absent';
  why_low_visibility?: string;
  key_observation: string;
  user_chunk_count: number;
  comp_chunk_count: number;
  is_blue_ocean?: boolean;
}

export interface EvalSummary {
  results: EvalResult[];
  avg_visibility_score: number;
  mention_rate: number;
  total_questions: number;
  score_breakdown: { 'high (8-10)': number; 'medium (5-7)': number; 'low (0-4)': number };
  top_competitor_domains: string[];
  blue_ocean_opportunities?: BlueOceanOpportunity[];
}

export interface PcaMeta {
  source: string;
  url: string;
  domain: string;
}

export interface PcaPoint {
  components: number[];
  source: string;
  domain: string;
  text: string;
}

export interface PcaInterpretation {
  dimension_name: string;
  explanation: string;
  negative_end: string;
  positive_end: string;
  variance_explained: number;
}

export interface Fix {
  title: string;
  problem: string;
  action: string;
  impact: 'high' | 'medium' | 'low';
  effort: string;
}

export interface ContentPiece {
  title: string;
  type: string;
  placement: string;
  suggested_content: string;
}

export interface Recommendations {
  executive_summary: string;
  overall_score_meaning: string;
  positioning_insight: string;
  priority_fixes: Fix[];
  content_to_add: ContentPiece[];
  topics_to_cover: string[];
}

export interface CompDoc {
  url: string;
  domain: string;
  text: string;
}

export interface EngineQuestionResult {
  question: string;
  answer: string;
  visibility_score: number;
  business_mentioned: boolean;
  mention_quality: 'prominent' | 'brief' | 'absent';
  key_observation: string;
}

export interface EngineResult {
  engine: string;
  available: boolean;
  results: EngineQuestionResult[];
  avg_visibility_score: number;
  mention_rate: number;
}

export interface MultiEngineResult {
  engines: EngineResult[];
  comparison_summary: string;
  best_engine: string;
  worst_engine: string;
  cross_engine_avg: number;
}

export interface AnalysisResult {
  biz: BusinessProfile;
  comp_docs: CompDoc[];
  eval: EvalSummary;
  coords: number[][];
  pca_meta: PcaMeta[];
  interps: PcaInterpretation[];
  recs: Recommendations;
  multi_engine?: MultiEngineResult;
}

export interface ProgressEvent {
  percent: number;
  message: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface AnalysisResponse {
  session_id: string;
  status: string;
  result?: AnalysisResult;
  progress?: ProgressEvent;
  error?: string;
}

export interface RecommendationResult {
  recommendations: string[]
  content_draft: string
}

export type WsEvent =
  | { type: 'heartbeat' }
  | { type: 'progress'; percent: number; message: string }
  | { type: 'result'; data: AnalysisResult }
  | { type: 'error'; message: string };
