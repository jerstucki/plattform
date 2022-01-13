import React, { FC, ReactNode } from 'react'
import { GENERAL_FEEDBACK_DISCUSSION_ID } from '../../../lib/constants'
import { useRouter } from 'next/router'
import useDiscussionData from './hooks/useDiscussionData'
import useOverlay from './hooks/overlays/useOverlay'
import DiscussionOverlays from './components/DiscussionOverlays'
import DiscussionContext, {
  DiscussionContextValue
} from './context/DiscussionContext'
import useDiscussionFocusHelper from './hooks/useDiscussionFocusHelper'
import DiscussionMetaHelper from './components/DiscussionMetaHelper'
import useDiscussionNotificationHelper from './hooks/useDiscussionNotificationHelper'
import useShareCommentOverlay from './hooks/overlays/useShareCommentOverlay'
import { DiscussionCredential } from './graphql/types/SharedTypes'
import { CommentFragmentType } from './graphql/fragments/CommentFragment.graphql'

/**
 * Wrapper component that provides the discussion data it's children.
 * It also handles logic for focusing on comments and displaying rendering of overlays.
 * @constructor
 */
const DiscussionProvider: FC<{
  children?: ReactNode
  discussionId: string
  board?: boolean
  parentId?: string
}> = ({ children, discussionId, board, parentId }) => {
  const { query } = useRouter()
  const orderBy =
    (query.order as string) ||
    (board
      ? 'HOT'
      : discussionId === GENERAL_FEEDBACK_DISCUSSION_ID
      ? 'DATE'
      : 'AUTO')

  const activeTag = query.tag as string
  const focusId = query.focus as string

  const depth = board ? 1 : 3

  const { discussion, error, loading, refetch, fetchMore } = useDiscussionData(
    discussionId,
    {
      orderBy,
      activeTag,
      depth,
      focusId,
      parentId
    }
  )

  useDiscussionNotificationHelper(discussion)

  const { loading: focusLoading, error: focusError } = useDiscussionFocusHelper(
    focusId,
    loading,
    discussion
  )

  // Create overlay state that is meant to be accessed by all discussion-components

  const shareOverlay = useShareCommentOverlay(discussion)

  const preferencesOverlay = useOverlay<DiscussionCredential>()
  const featureOverlay = useOverlay<CommentFragmentType>()

  const contextValue: DiscussionContextValue = {
    id: discussionId,
    discussion,
    loading: loading,
    error: error,
    fetchMore,
    refetch,
    orderBy,
    activeTag,
    focus: {
      loading: focusLoading,
      error: focusError
    },
    overlays: {
      shareOverlay,
      preferencesOverlay,
      featureOverlay
    }
  }

  return (
    <DiscussionContext.Provider value={contextValue}>
      <div data-discussion-id={discussionId}>
        {children}
        {discussion && (
          <>
            <DiscussionOverlays />
            <DiscussionMetaHelper />
          </>
        )}
      </div>
    </DiscussionContext.Provider>
  )
}

export default DiscussionProvider
