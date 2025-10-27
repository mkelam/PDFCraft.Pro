/**
 * BMAD AI AGENT TYPE DEFINITIONS
 *
 * Comprehensive TypeScript interfaces for BMAD AI agent integration
 * into the pdflab.pro service container architecture
 */

import { ConversionResult, ConversionOptions } from './pdf-conversion.types';

/**
 * Core BMAD Agent Interface
 * Defines the standard contract for all BMAD agents
 */
export interface BMADAgent {
  /** Unique agent identifier */
  readonly id: string;

  /** Agent display name */
  readonly name: string;

  /** Agent version */
  readonly version: string;

  /** Agent persona configuration */
  readonly persona: AgentPersona;

  /** Available agent capabilities */
  readonly capabilities: AgentCapability[];

  /** Current agent status */
  readonly status: AgentStatus;

  /** Agent initialization */
  initialize(): Promise<void>;

  /** Execute agent task */
  execute(task: AgentTask): Promise<AgentResponse>;

  /** Get agent health status */
  getHealth(): Promise<AgentHealthCheck>;

  /** Cleanup resources */
  dispose(): Promise<void>;
}

/**
 * Agent Persona Configuration
 * Defines the agent's behavioral characteristics and expertise
 */
export interface AgentPersona {
  /** Agent role description */
  role: string;

  /** Areas of expertise */
  expertise: string[];

  /** Communication style */
  style: 'analytical' | 'conversational' | 'technical' | 'concise';

  /** Core operating principles */
  coreRrinciples: string[];

  /** Operational directives */
  operationalDirectives: string[];

  /** Decision-making approach */
  decisionApproach: 'data-driven' | 'heuristic' | 'hybrid';
}

/**
 * Agent Capability Definition
 * Describes a specific task the agent can perform
 */
export interface AgentCapability {
  /** Capability identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Input schema validation */
  inputSchema: Record<string, any>;

  /** Output schema specification */
  outputSchema: Record<string, any>;

  /** Estimated execution time in milliseconds */
  estimatedExecutionTime: number;

  /** Resource requirements */
  resourceRequirements: ResourceRequirements;

  /** Dependencies on other agents or services */
  dependencies?: string[];
}

/**
 * Resource Requirements for Agent Capabilities
 */
export interface ResourceRequirements {
  /** CPU intensity level */
  cpu: 'low' | 'medium' | 'high';

  /** Memory requirements in MB */
  memory: number;

  /** Network bandwidth requirements */
  network: 'none' | 'low' | 'medium' | 'high';

  /** Storage requirements in MB */
  storage: number;
}

/**
 * Agent Task Definition
 * Represents a specific task to be executed by an agent
 */
export interface AgentTask {
  /** Task unique identifier */
  id: string;

  /** Capability to execute */
  capability: string;

  /** Task input data */
  input: Record<string, any>;

  /** Additional context for task execution */
  context?: AgentContext;

  /** Task priority level */
  priority: 'low' | 'medium' | 'high' | 'urgent';

  /** Maximum execution time in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retryConfig?: RetryConfig;
}

/**
 * Agent Context Information
 * Provides situational context for task execution
 */
export interface AgentContext {
  /** User ID if applicable */
  userId?: number;

  /** Conversion job ID if applicable */
  jobId?: string;

  /** Session-specific data */
  sessionData?: Record<string, any>;

  /** Current system state */
  systemState?: Record<string, any>;

  /** Request timestamp */
  timestamp: Date;

  /** Correlation ID for tracking */
  correlationId?: string;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;

  /** Initial retry delay in milliseconds */
  initialDelay: number;

  /** Backoff strategy */
  backoffStrategy: 'linear' | 'exponential' | 'fixed';

  /** Maximum retry delay */
  maxDelay?: number;
}

/**
 * Agent Response
 * Standard response format from agent task execution
 */
export interface AgentResponse {
  /** Task execution success status */
  success: boolean;

  /** Response data */
  data?: any;

  /** Error information if failed */
  error?: AgentError;

  /** Response metadata */
  metadata: ResponseMetadata;

  /** Follow-up recommendations */
  recommendations?: AgentRecommendation[];
}

/**
 * Agent Error Information
 */
export interface AgentError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Technical details */
  details?: Record<string, any>;

  /** Recovery suggestions */
  recoverySuggestions?: string[];

  /** Retry eligibility */
  retryable: boolean;
}

/**
 * Response Metadata
 */
export interface ResponseMetadata {
  /** Task processing time in milliseconds */
  processingTime: number;

  /** Agent confidence in the result (0-1) */
  confidence: number;

  /** Resource utilization during execution */
  resourceUsage: ResourceUsage;

  /** Next suggested actions */
  nextActions?: string[];

  /** Quality score of the result */
  qualityScore?: number;
}

/**
 * Resource Usage Tracking
 */
export interface ResourceUsage {
  /** CPU usage percentage */
  cpu: number;

  /** Memory usage in MB */
  memory: number;

  /** Network I/O in KB */
  networkIO: number;

  /** Storage I/O in KB */
  storageIO: number;
}

/**
 * Agent Recommendation
 */
export interface AgentRecommendation {
  /** Recommendation type */
  type: 'optimization' | 'improvement' | 'warning' | 'info';

  /** Recommendation message */
  message: string;

  /** Priority level */
  priority: 'low' | 'medium' | 'high';

  /** Actionable steps */
  actions?: string[];

  /** Expected impact */
  expectedImpact?: string;
}

/**
 * Agent Status
 * Current operational status of an agent
 */
export interface AgentStatus {
  /** Current state */
  state: 'idle' | 'busy' | 'error' | 'maintenance' | 'initializing';

  /** Currently executing task ID */
  currentTaskId?: string;

  /** Tasks in queue */
  queuedTasks: number;

  /** Performance metrics */
  performance: PerformanceMetrics;

  /** Last activity timestamp */
  lastActivity: Date;

  /** Health status */
  health: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  /** Total tasks completed */
  tasksCompleted: number;

  /** Average response time in milliseconds */
  averageResponseTime: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Total errors encountered */
  errorCount: number;

  /** Throughput (tasks per minute) */
  throughput: number;

  /** Resource efficiency score (0-1) */
  resourceEfficiency: number;
}

/**
 * Agent Health Check
 */
export interface AgentHealthCheck {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Individual health checks */
  checks: HealthCheck[];

  /** Health check timestamp */
  timestamp: Date;

  /** Next health check scheduled time */
  nextCheck?: Date;
}

/**
 * Individual Health Check
 */
export interface HealthCheck {
  /** Check name */
  name: string;

  /** Check status */
  status: 'pass' | 'fail' | 'warn';

  /** Check message */
  message: string;

  /** Check duration in milliseconds */
  duration: number;
}

/**
 * Agent Factory Interface
 * For creating agent instances
 */
export interface AgentFactory {
  /** Agent type identifier */
  readonly type: string;

  /** Create new agent instance */
  create(config: AgentConfiguration): Promise<BMADAgent>;

  /** Validate agent configuration */
  validateConfig(config: AgentConfiguration): ValidationResult;
}

/**
 * Agent Configuration
 */
export interface AgentConfiguration {
  /** Agent ID */
  id: string;

  /** Configuration parameters */
  parameters: Record<string, any>;

  /** Resource limits */
  resourceLimits?: ResourceLimits;

  /** Environment variables */
  environment?: Record<string, string>;
}

/**
 * Resource Limits
 */
export interface ResourceLimits {
  /** Maximum memory usage in MB */
  maxMemory: number;

  /** Maximum CPU percentage */
  maxCpu: number;

  /** Maximum execution time per task in milliseconds */
  maxExecutionTime: number;

  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Validation success status */
  valid: boolean;

  /** Validation errors */
  errors?: string[];

  /** Validation warnings */
  warnings?: string[];
}

/**
 * PDF Quality Analysis Result
 * Specific to PDF Quality Optimizer Agent
 */
export interface PDFQualityAnalysis {
  /** Overall quality score (0-100) */
  overallScore: number;

  /** Document complexity analysis */
  complexity: DocumentComplexity;

  /** Content analysis results */
  contentAnalysis: ContentAnalysis;

  /** Optimization recommendations */
  optimizationRecommendations: OptimizationRecommendation[];

  /** Predicted conversion quality */
  predictedQuality: QualityPrediction;

  /** Processing recommendations */
  processingRecommendations: ProcessingRecommendation[];
}

/**
 * Document Complexity Analysis
 */
export interface DocumentComplexity {
  /** Text complexity score (0-10) */
  textComplexity: number;

  /** Visual complexity score (0-10) */
  visualComplexity: number;

  /** Structure complexity score (0-10) */
  structureComplexity: number;

  /** Overall complexity level */
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'very-complex';

  /** Complexity factors */
  factors: string[];
}

/**
 * Content Analysis
 */
export interface ContentAnalysis {
  /** Text analysis results */
  text: TextAnalysis;

  /** Image analysis results */
  images: ImageAnalysis;

  /** Form analysis results */
  forms: FormAnalysis;

  /** Table analysis results */
  tables: TableAnalysis;
}

/**
 * Text Analysis
 */
export interface TextAnalysis {
  /** Total character count */
  characterCount: number;

  /** Word count */
  wordCount: number;

  /** Line count */
  lineCount: number;

  /** Font diversity score */
  fontDiversity: number;

  /** Text density per page */
  textDensity: number;

  /** Language detection results */
  languages: string[];
}

/**
 * Image Analysis
 */
export interface ImageAnalysis {
  /** Total image count */
  imageCount: number;

  /** Image types detected */
  imageTypes: string[];

  /** Average image size */
  averageImageSize: number;

  /** Image quality assessment */
  imageQuality: 'low' | 'medium' | 'high';

  /** Complex graphics detected */
  hasComplexGraphics: boolean;
}

/**
 * Form Analysis
 */
export interface FormAnalysis {
  /** Form field count */
  fieldCount: number;

  /** Form types detected */
  formTypes: string[];

  /** Interactive elements detected */
  hasInteractiveElements: boolean;

  /** Form complexity level */
  complexityLevel: 'simple' | 'moderate' | 'complex';
}

/**
 * Table Analysis
 */
export interface TableAnalysis {
  /** Table count */
  tableCount: number;

  /** Complex tables detected */
  hasComplexTables: boolean;

  /** Average table size */
  averageTableSize: number;

  /** Table formatting complexity */
  formattingComplexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Optimization Recommendation
 */
export interface OptimizationRecommendation {
  /** Recommendation category */
  category: 'preprocessing' | 'engine-selection' | 'postprocessing' | 'quality-enhancement';

  /** Recommendation title */
  title: string;

  /** Detailed description */
  description: string;

  /** Expected improvement */
  expectedImprovement: number;

  /** Implementation complexity */
  complexity: 'low' | 'medium' | 'high';

  /** Resource impact */
  resourceImpact: 'minimal' | 'moderate' | 'significant';
}

/**
 * Quality Prediction
 */
export interface QualityPrediction {
  /** Predicted text preservation (0-1) */
  textPreservation: number;

  /** Predicted layout preservation (0-1) */
  layoutPreservation: number;

  /** Predicted visual preservation (0-1) */
  visualPreservation: number;

  /** Overall predicted quality score (0-1) */
  overallQuality: number;

  /** Confidence in prediction (0-1) */
  confidence: number;

  /** Potential issues */
  potentialIssues: string[];
}

/**
 * Processing Recommendation
 */
export interface ProcessingRecommendation {
  /** Recommended engine */
  recommendedEngine: string;

  /** Processing parameters */
  parameters: Record<string, any>;

  /** Alternative engines */
  alternatives: string[];

  /** Rationale for recommendation */
  rationale: string;

  /** Expected processing time */
  expectedProcessingTime: number;
}

/**
 * Agent Event Types
 * For agent lifecycle and monitoring events
 */
export type AgentEventType =
  | 'agent-initialized'
  | 'agent-started'
  | 'agent-stopped'
  | 'agent-error'
  | 'task-started'
  | 'task-completed'
  | 'task-failed'
  | 'performance-threshold'
  | 'health-check'
  | 'resource-warning';

/**
 * Agent Event
 */
export interface AgentEvent {
  /** Event type */
  type: AgentEventType;

  /** Agent ID */
  agentId: string;

  /** Event timestamp */
  timestamp: Date;

  /** Event data */
  data: Record<string, any>;

  /** Severity level */
  severity: 'info' | 'warn' | 'error' | 'critical';

  /** Correlation ID */
  correlationId?: string;
}

/**
 * Agent Registry Interface
 * For managing multiple agents
 */
export interface AgentRegistryInterface {
  /** Register a new agent */
  register(agent: BMADAgent): Promise<void>;

  /** Unregister an agent */
  unregister(agentId: string): Promise<void>;

  /** Get agent by ID */
  get(agentId: string): BMADAgent | null;

  /** Get all registered agents */
  getAll(): BMADAgent[];

  /** Get agents by capability */
  getByCapability(capability: string): BMADAgent[];

  /** Get agents by status */
  getByStatus(status: AgentStatus['state']): BMADAgent[];

  /** Execute task on best available agent */
  executeTask(task: AgentTask): Promise<AgentResponse>;
}

/**
 * Agent Orchestrator Interface
 * For coordinating multiple agents
 */
export interface AgentOrchestratorInterface {
  /** Execute workflow across multiple agents */
  executeWorkflow(workflow: AgentWorkflow): Promise<WorkflowResult>;

  /** Schedule recurring agent tasks */
  scheduleTask(schedule: TaskSchedule): Promise<string>;

  /** Cancel scheduled task */
  cancelScheduledTask(scheduleId: string): Promise<void>;

  /** Get workflow status */
  getWorkflowStatus(workflowId: string): Promise<WorkflowStatus>;
}

/**
 * Agent Workflow Definition
 */
export interface AgentWorkflow {
  /** Workflow ID */
  id: string;

  /** Workflow steps */
  steps: WorkflowStep[];

  /** Workflow configuration */
  config: WorkflowConfig;

  /** Input data */
  input: Record<string, any>;
}

/**
 * Workflow Step
 */
export interface WorkflowStep {
  /** Step ID */
  id: string;

  /** Agent to execute step */
  agentId: string;

  /** Task to execute */
  task: Omit<AgentTask, 'id'>;

  /** Step dependencies */
  dependencies: string[];

  /** Conditional execution */
  condition?: string;
}

/**
 * Workflow Configuration
 */
export interface WorkflowConfig {
  /** Maximum execution time */
  timeout: number;

  /** Parallel execution allowed */
  allowParallel: boolean;

  /** Failure handling strategy */
  failureStrategy: 'stop' | 'continue' | 'retry';

  /** Retry configuration */
  retryConfig?: RetryConfig;
}

/**
 * Workflow Result
 */
export interface WorkflowResult {
  /** Workflow execution success */
  success: boolean;

  /** Step results */
  stepResults: Record<string, AgentResponse>;

  /** Overall execution time */
  executionTime: number;

  /** Workflow error if failed */
  error?: AgentError;

  /** Final output data */
  output?: Record<string, any>;
}

/**
 * Workflow Status
 */
export interface WorkflowStatus {
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Completed steps */
  completedSteps: string[];

  /** Currently executing steps */
  runningSteps: string[];

  /** Failed steps */
  failedSteps: string[];

  /** Progress percentage */
  progress: number;
}

/**
 * Task Schedule
 */
export interface TaskSchedule {
  /** Schedule ID */
  id: string;

  /** Agent ID to execute task */
  agentId: string;

  /** Task to schedule */
  task: Omit<AgentTask, 'id'>;

  /** Cron expression for scheduling */
  cronExpression: string;

  /** Schedule start time */
  startTime?: Date;

  /** Schedule end time */
  endTime?: Date;

  /** Maximum executions */
  maxExecutions?: number;
}