import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { JobPoller } from './job-poller'
import type { AiJobStatus } from '@/types/database'

export default async function AiJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()

  const { data: job } = await supabase
    .from('ai_jobs')
    .select('*, clients(name)')
    .eq('id', id)
    .eq('workspace_id', member?.workspace_id)
    .single()

  if (!job) notFound()

  const { data: suggestions } = await supabase
    .from('ai_clip_suggestions')
    .select('*')
    .eq('job_id', id)
    .order('viral_score', { ascending: false })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard/ai-clipper" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={14} /> AI Clipper
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 truncate max-w-lg">{job.video_filename}</h1>
            <JobStatusBadge status={job.status as AiJobStatus} />
          </div>
          <p className="text-sm text-gray-500">
            {(job.clients as {name: string} | null)?.name && <span className="mr-3">{(job.clients as {name: string}).name}</span>}
            Up to {job.max_clips} clips · {job.min_duration_s}–{job.max_duration_s}s
          </p>
        </div>
      </div>

      {/* Live-polling client component that takes over when job is not done */}
      <JobPoller
        jobId={id}
        initialStatus={job.status as AiJobStatus}
        initialSuggestions={suggestions ?? []}
        initialError={job.error_message}
      />
    </div>
  )
}

function JobStatusBadge({ status }: { status: AiJobStatus }) {
  const map = {
    uploading: 'gray',
    processing: 'yellow',
    done: 'green',
    error: 'red',
  } as const
  return <Badge variant={map[status] ?? 'gray'}>{status}</Badge>
}
