import { CheckCircle2 } from 'lucide-react'
import type { ProgressEvent } from '../../api/types'

interface LoadingStagesProps {
  progress: ProgressEvent | null
}

interface Stage {
  id: number
  label: string
}

interface StagePattern {
  substring: string
  stageId: number
}

const STAGES: Stage[] = [
  { id: 0, label: 'Fetching your website' },
  { id: 1, label: 'Business analysis' },
  { id: 2, label: 'Competitor discovery' },
  { id: 3, label: 'Competitor research' },
  { id: 4, label: 'Content processing' },
  { id: 5, label: 'AI embeddings' },
  { id: 6, label: 'Test generation' },
  { id: 7, label: 'Visibility evaluation' },
  { id: 8, label: 'Multi-engine testing' },
  { id: 9, label: 'Ocean analysis' },
]

// Patterns to detect current stage from backend message
// Order matters: more specific patterns should come first
const STAGE_PATTERNS: StagePattern[] = [
  { substring: 'Fetching your business website', stageId: 0 },
  { substring: 'Extracting business information', stageId: 1 },
  { substring: 'Searching for competitors', stageId: 2 },
  { substring: 'Fetching', stageId: 3 }, // "Fetching X competitor websites..."
  { substring: 'Chunking documents', stageId: 4 },
  { substring: 'Building semantic embeddings', stageId: 5 },
  { substring: 'Generating test questions', stageId: 6 },
  { substring: 'Evaluating visibility', stageId: 7 },
  { substring: 'Testing across', stageId: 8 },
  { substring: 'Analyzing competitive', stageId: 9 },
]

function findCurrentStageIndex(message: string): number {
  for (const pattern of STAGE_PATTERNS) {
    if (message.includes(pattern.substring)) {
      return pattern.stageId
    }
  }
  return 0
}

function calculateCompletedStages(
  percent: number,
  stageCount: number
): number {
  return Math.floor((percent / 100) * stageCount)
}

interface StageCardProps {
  stage: Stage
  isCompleted: boolean
  isCurrent: boolean
}

function StageCard({ stage, isCompleted, isCurrent }: StageCardProps) {
  return (
    <div
      className={`card p-4 flex items-start gap-3 transition-all ${
        isCurrent ? 'ring-2 ring-offset-1 ring-offset-base ring-color-primary' : ''
      }`}
    >
      <div className="mt-1 flex-shrink-0">
        {isCompleted ? (
          <CheckCircle2
            size={20}
            className="text-color-primary"
            strokeWidth={2.5}
          />
        ) : (
          <div
            className={`w-5 h-5 rounded-full border-2 ${
              isCurrent
                ? 'border-color-primary bg-color-primary/10'
                : 'border-text-muted'
            }`}
          />
        )}
      </div>
      <div className="flex-1">
        <div
          className={`text-sm font-500 ${
            isCompleted || isCurrent
              ? 'text-text-primary'
              : 'text-text-muted'
          }`}
        >
          {stage.label}
        </div>
      </div>
    </div>
  )
}

export default function LoadingStages({ progress }: LoadingStagesProps) {
  if (!progress) {
    return null
  }

  const stageCount = STAGES.length
  const completedCount = calculateCompletedStages(progress.percent, stageCount)
  const currentStageId = findCurrentStageIndex(progress.message)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {STAGES.map((stage) => (
        <StageCard
          key={stage.id}
          stage={stage}
          isCompleted={stage.id < completedCount}
          isCurrent={stage.id === currentStageId}
        />
      ))}
    </div>
  )
}
