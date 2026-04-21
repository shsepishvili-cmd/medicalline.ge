'use client'

// =============================================================================
// Admin > Academy > Edit video
// =============================================================================

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  useAcademyAdminGate,
  AcademyAdminShell,
  LoadingView,
  AuthBlockedView,
  ui,
  colors,
} from '../../_components/AcademyUi'
import VideoForm from '../../_components/VideoForm'
import { adminGetVideoById } from '@/app/lib/academy'
import type { AcademyVideo } from '@/app/lib/academy-types'

export default function EditVideoPage() {
  const { loading, error, profile } = useAcademyAdminGate()
  const params = useParams()
  const videoId = typeof params.id === 'string' ? params.id : ''

  const [video, setVideo] = useState<AcademyVideo | null>(null)
  const [videoLoading, setVideoLoading] = useState(true)
  const [videoError, setVideoError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || error || !videoId) return
    adminGetVideoById(videoId).then(v => {
      if (!v) setVideoError('ვიდეო ვერ მოიძებნა.')
      else setVideo(v)
      setVideoLoading(false)
    })
  }, [loading, error, videoId])

  if (loading || videoLoading) return <LoadingView label="ვიდეო იტვირთება..." />
  if (error)       return <AuthBlockedView message={error} />
  if (!profile)    return null
  if (videoError)  return (
    <div style={ui.page}>
      <div style={{ ...ui.wrap, maxWidth: 720 }}>
        <div style={{ ...ui.panel, textAlign: 'center', padding: 28 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>
            {videoError}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <AcademyAdminShell
      title="ვიდეოს რედაქტირება"
      subtitle={video?.title ?? ''}
      profile={profile}
    >
      <VideoForm videoId={videoId} initialVideo={video} />
    </AcademyAdminShell>
  )
}
