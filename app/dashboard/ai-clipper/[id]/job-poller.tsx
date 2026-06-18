'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Scissors, ExternalLink, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { AiJobStatus, AiClipSuggestion, CutStatus } from '@/types/database'

interface Props {
  jobId: string
  initialStatus: AiJobStatus
  initialSuggestions: AiClipSuggestion[]
  initialError: string | null
}

export function JobPoller({ jobId, initialStatus, initialSuggestions, initialError }: Props) {
  const [status, setStatus] = useState<AiJobStatus>(initialStatus)
  const [suggestions, setSuggestions] = useState<AiClipSuggestion[]>(initialSuggestions)
  const [error, setError] = useState<string | null>(initialError)
  const [cuttingIds, setCuttingIds] = useState<Set<string>>(new Set())

  const poll = useCallback(async () => {
    const res = await fetch(`/api/ai-clipper/jobs/${jobId}`)
    if (!res.ok) return
    const data = await res.json()
    setStatus(data.job.status)
    setError(data.job.error_message)
    setSuggestions(data.suggestions ?? [])
  }, [jobId])

  // Poll while processing
  useEffect(() => {
    if (status === 'done' || status === 'error') return
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [status, poll])

  // Also poll while any suggestion is cutting
  useEffect(() => {
    const anyCutting = suggestions.some(s => s.cut_status === 'cutting')
    if (!anyCutting) return
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [suggestions, poll])

  async function handleCut(suggestionId: string) {
    setCuttingIds(prev => new Set(prev).add(suggestionId))
    try {
      await fetch(`/api/ai-clipper/suggestions/${suggestionId}/cut`, { method: 'POST' })
      // Start polling — the cut runs in background
    } catch {
      setCuttingIds(prev => { const s = new Set(prev); s.delete(suggestionId); return s })
    }
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <Card className="text-center py-16">
        <Loader2 size={36} className="mx-auto text-indigo-500 animate-spin mb-4" />
        <p className="font-semibold text-gray-900">
          {status === 'uploading' ? 'Waiting for upload…' : 'Analysing video with AI…'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {status === 'processing'
            ? 'Transcribing audio and finding viral moments. This takes 1–3 minutes.'
            : 'Upload your video to get started.'}
        </p>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card className="text-center py-12">
        <AlertCircle size={36} className="mx-auto text-red-400 mb-3" />
        <p className="font-semibold text-gray-900 mb-1">Processing failed</p>
        {error && <p className="text-sm text-red-600 max-w-md mx-auto">{error}</p>}
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className="text-center py-12">
        <Sparkles size={36} className="mx-auto text-gray-300 mb-3" />
        <p className="font-semibold text-gray-900 mb-1">No viral moments found</p>
        <p className="text-sm text-gray-500">Try adjusting clip length or content with stronger emotional peaks.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{suggestions.length} viral moments found — ordered by viral score</p>
      {suggestions.map((s, i) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          rank={i + 1}
          onCut={handleCut}
          localCutting={cuttingIds.has(s.id)}
        />
      ))}
    </div>
  )
}

function SuggestionCard({
  suggestion: s,
  rank,
  onCut,
  localCutting,
}: {
  suggestion: AiClipSuggestion
  rank: number
  onCut: (id: string) => void
  localCutting: boolean
}) {
  const isCutting = s.cut_status === 'cutting' || localCutting
  const isDone = s.cut_status === 'done'
  const isError = s.cut_status === 'error'
  const duration = Math.round(s.end_time - s.start_time)

  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* Rank + score */}
        <div className="text-center shrink-0 w-12">
          <p className="text-xs text-gray-400">#{rank}</p>
          <p className={`text-lg font-bold mt-0.5 ${
            s.viral_score >= 80 ? 'text-green-600' :
            s.viral_score >= 60 ? 'text-yellow-600' : 'text-gray-600'
          }`}>{s.viral_score}</p>
          <p className="text-xs text-gray-400">score</p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 leading-snug">{s.title}</h3>
            <ScoreBadge score={s.viral_score} />
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
            <span>{formatTime(s.start_time)} → {formatTime(s.end_time)}</span>
            <span>{duration}s</span>
          </div>

          {/* Multi-signal score breakdown */}
          {(s.text_score != null || s.visual_score != null || s.audio_score != null) && (
            <ScoreBreakdown
              textScore={s.text_score}
              visualScore={s.visual_score}
              audioScore={s.audio_score}
            />
          )}

          <blockquote className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mb-2 font-medium">
            &ldquo;{s.hook}&rdquo;
          </blockquote>

          <p className="text-sm text-gray-600">{s.reason}</p>

          {s.visual_analysis && s.visual_analysis !== 'Visual analysis unavailable.' && (
            <p className="text-xs text-gray-500 mt-2 italic border-l-2 border-gray-200 pl-2">
              👁 {s.visual_analysis}
            </p>
          )}

          {isError && s.cut_error && (
            <p className="text-xs text-red-600 mt-2">Cut failed: {s.cut_error}</p>
          )}
        </div>

        {/* Action */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {isDone ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <CheckCircle2 size={14} /> Cut done
              </div>
              {s.clip_id && (
                <Link href={`/dashboard/clips`}>
                  <Button variant="secondary" size="sm">
                    <ExternalLink size={12} /> View clip
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              variant={isError ? 'danger' : 'primary'}
              loading={isCutting}
              disabled={isCutting}
              onClick={() => onCut(s.id)}
            >
              {!isCutting && <Scissors size={14} />}
              {isCutting ? 'Cutting…' : isError ? 'Retry cut' : 'Cut clip'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="green">High viral</Badge>
  if (score >= 60) return <Badge variant="yellow">Good</Badge>
  return <Badge variant="gray">Moderate</Badge>
}

function ScoreBreakdown({
  textScore,
  visualScore,
  audioScore,
}: {
  textScore: number | null
  visualScore: number | null
  audioScore: number | null
}) {
  const rows = [
    { label: '📝 Transcript', score: textScore, weight: '55%', tip: 'Hook quality, emotional language & quotability' },
    { label: '👁 Visual',     score: visualScore, weight: '35%', tip: 'Eye contact, expressions & body language' },
    { label: '🔊 Audio',      score: audioScore,  weight: '10%', tip: 'Vocal energy & excitement peaks' },
  ].filter(r => r.score != null)

  if (rows.length === 0) return null

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 space-y-1.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Score breakdown</p>
      {rows.map(({ label, score, weight, tip }) => (
        <div key={label} title={tip}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-xs font-semibold text-gray-700">{score}<span className="text-gray-400 font-normal">/{100}</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (score ?? 0) >= 80 ? 'bg-green-500' :
                (score ?? 0) >= 60 ? 'bg-yellow-400' : 'bg-gray-400'
              }`}
              style={{ width: `${score ?? 0}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-gray-400 pt-0.5">Weights: {rows.map(r => `${r.label.split(' ')[1]} ${r.weight}`).join(' · ')}</p>
    </div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
