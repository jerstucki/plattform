import { useEffect, useState } from 'react'
import { ApolloError, ApolloQueryResult, useQuery } from '@apollo/client'
import { COMMENT_SUBSCRIPTION } from '../../graphql/documents'
import produce from '../../../../lib/immer'
import { bumpCounts, mergeComment, mergeComments } from '../../graphql/store'
import {
  DiscussionObject,
  DiscussionQueryData,
  DiscussionQueryVariables,
  ENHANCED_DISCUSSION_QUERY
} from '../graphql/DiscussionQuery.graphql'

// TODO: Add proper type
type CommentSubscriptionData = {
  comment: any
}

type CommentSubscriptionVariables = {
  discussionId: string
}

type DiscussionOptions = {
  orderBy: string
  activeTag?: string
  depth?: number
  focusId?: string
  parentId?: string
  first?: number
}

type FetchMoreParams = DiscussionQueryVariables & {
  appendAfter?: string
}

// Data returned by the hook
type DiscussionData = {
  discussion?: DiscussionObject
  loading: boolean
  error: ApolloError
  refetch: (
    variables: DiscussionQueryVariables
  ) => Promise<ApolloQueryResult<DiscussionQueryData>>
  fetchMore: (
    params: FetchMoreParams
  ) => Promise<ApolloQueryResult<DiscussionQueryData>>
}

function useDiscussionData(
  discussionId: string,
  options?: DiscussionOptions
): DiscussionData {
  const {
    data: { discussion } = {},
    error,
    loading,
    fetchMore,
    subscribeToMore,
    refetch,
    previousData
  } = useQuery<DiscussionQueryData, DiscussionQueryVariables>(
    ENHANCED_DISCUSSION_QUERY,
    {
      variables: {
        discussionId,
        orderBy: options.orderBy,
        depth: options.depth,
        first: options.first || 100,
        focusId: options.focusId,
        activeTag: options.activeTag
      },
      onCompleted: () => {
        console.debug('Finished fetching discussion data', discussion, {
          variables: {
            discussionId,
            orderBy: options.orderBy,
            activeTag: options.activeTag,
            depth: options.depth,
            focusId: options.focusId
          }
        })
      }
    }
  )

  /**
   * Merge previous and next comments when fetching more
   * @param parentId
   * @param after
   * @param appendAfter
   * @param depth
   * @param includeParent
   */
  const enhancedFetchMore = ({
    parentId,
    after,
    appendAfter,
    depth,
    includeParent
  }: FetchMoreParams) =>
    fetchMore({
      variables: {
        discussionId,
        parentId,
        after,
        orderBy: options.orderBy,
        activeTag: options.activeTag,
        depth: depth || 3,
        includeParent
      },
      // Explanation: updateQuery is deprecated and not typed in TS
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      updateQuery: (previousResult, { fetchMoreResult: { discussion } }) => {
        return produce(
          previousResult,
          mergeComments({
            parentId,
            appendAfter,
            comments: discussion.comments
          })
        )
      }
    })

  const subscribeToComments = subscribeToMore<
    CommentSubscriptionData,
    CommentSubscriptionVariables
  >({
    document: COMMENT_SUBSCRIPTION,
    variables: { discussionId },
    onError(...args) {
      console.debug('subscribe:onError', args)
    },
    updateQuery: (previousResult, { subscriptionData }) => {
      const initialParentId = options.parentId

      /*
       * Regardless of what we do here, the Comment object in the cache will be updated.
       * We only have to take care of updating objects other than the Comment, like in
       * this case update the Discussion object. This is why we only care about the
       * 'CREATED' mutation and ignore 'DELETED' (which can't happen anyways) and 'UPDATED'.
       */
      if (
        subscriptionData.data &&
        subscriptionData.data.comment.mutation === 'CREATED'
      ) {
        const comment = subscriptionData.data.comment.node

        if (initialParentId && !comment.parentIds.includes(initialParentId)) {
          return previousResult
        }

        /*
         * Ignore updates related to comments we created in the current client session.
         * If this is the first comment in the discussion, show it immediately. Otherwise
         * just bump the counts and let the user click the "Load More" buttons.
         */
        if (previousResult.discussion.comments.totalCount === 0) {
          return produce(
            previousResult,
            mergeComment({
              comment,
              initialParentId,
              activeTag: options.activeTag
            })
          )
        } else {
          return produce(
            previousResult,
            bumpCounts({ comment, initialParentId })
          )
        }
      } else {
        return previousResult
      }
    }
  })

  useEffect(() => {
    if (discussion && subscribeToComments) {
      subscribeToComments()
    }
  }, [discussion, subscribeToComments])

  /**
   * --- FOCUS LOGIC ---
   */
  const [focusState, setFocusState] = useState({
    focusId: options.focusId,
    loading: !!options.focusId,
    error: undefined
  })

  useEffect(() => {
    if (options.focusId != focusState.focusId) {
      setFocusState(state => ({
        ...state,
        focusId: options.focusId
      }))
    }
  }, [options.focusId, focusState.focusId])

  useEffect(() => {
    if (loading || !discussion || !focusState.loading) {
      return
    }

    console.debug('looking for focused comment')
    if (discussion && discussion.comments.focus) {
      const focusedComment = discussion.comments.nodes.find(
        comment => comment.id === discussion.comments.focus.id
      )

      if (focusedComment) {
        setFocusState(state => ({ ...state, loading: false }))
        console.debug('FOUND FOCUSED COMMENT!')
      }
    }
  }, [loading, discussion, focusState])

  return {
    discussion: discussion || previousData,
    loading: loading || focusState.loading,
    error,
    refetch,
    fetchMore: enhancedFetchMore
  }
}

export default useDiscussionData
