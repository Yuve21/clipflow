import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Sparkles, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { NewJobButton } from './new-job-button'
import type { AiJobStatus } from '@/types/database'

export default async function AiClipperPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()

  const { data: workspace } = await supabase
    .from('workspaces').select('plan').eq('id', member?.workspace_id).single()

  const { data: jobs } = await supabase
    .from('ai_jobs')
    .select('*, clients(name), ai_clip_suggestions(id)')
    .eq('workspace_id', member?.workspace_id)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients').select('id, name').eq('workspace_id', member?.workspace_id).eq('status', 'active')

  const isPro = workspace?.plan === 'pro'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">AI Clipper</h1>
            <Badge variant="indigo">Beta</Badge>
          </div>
          <p className="text-sm text-gray-500">Upload a long video — AI finds the most viral moments and cuts them for you.</p>
        </div>
        <NewJobButton clients={clients ?? []} isPro={isPro} />
      </div>

      {!isPro && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles size={18} className="text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-900">AI Clipper is a Pro feature</p>
            <p className="text-sm text-indigo-700 mt-0.5">Upgrade to Pro to process videos with AI and auto-generate viral clips.</p>
          </div>
        </div>
      )}

      {!jobs?.length ? (
        <Card className="text-center py-16">
          <Sparkles size={40} className="mx-auto text-indigo-300 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">No AI jobs yet</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">Upload a stream VOD or podcast segment and let AI find the clips worth posting.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const suggestionCount = (job.ai_clip_suggestions as {id: string}[])?.length ?? 0
            return (
              <Link key={job.id} href={`/dashboard/ai-clipper/${job.id}`}>
                <Card className="hover:border-indigo-200 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">{job.video_filename}</p>
                        <JobStatusBadge status={job.status as AiJobStatus} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {(job.clients as {name: string} | null)?.name && (
                          <span>{(job.clients as {name: string}).name}</span>
                        )}
                        {job.status === 'done' && (
                          <span>{suggestionCount} clip{suggestionCount !== 1 ? 's' : ''} found</span>
                        )}
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        <span>Up to {job.max_clips} clips · {job.min_duration_s}–{job.max_duration_s}s</span>
                      </div>
                    </div>
                    {job.status === 'processing' && (
                      <Loader2 size={16} className="text-indigo-500 animate-spin shrink-0 ml-4" />
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function JobStatusBadge({ status }: { status: AiJobStatus }) {
  const map = {
    uploading: { variant: 'gray' as const, label: 'Uploading', icon: Clock },
    processing: { variant: 'yellow' as const, label: 'Processing', icon: Loader2 },
    done: { variant: 'green' as const, label: 'Done', icon: CheckCircle2 },
    error: { variant: 'red' as const, label: 'Error', icon: AlertCircle },
  }
  const { variant, label } = map[status] ?? map.error
  return <Badge variant={variant}>{label}</Badge>
}
