import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { TeaserActiveDebates } from '@project-r/styleguide/lib/components/TeaserActiveDebates'

const feedQuery = gql`
  query getFrontFeed(
    $filters: [SearchGenericFilterInput!]
    $minPublishDate: DateRangeInput
  ) {
    feed: search(
      filters: $filters
      filter: { feed: true, publishedAt: $minPublishDate }
      sort: { key: publishedAt, direction: DESC }
    ) {
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        entity {
          ... on Document {
            id
            meta {
              credits
              shortTitle
              title
              description
              publishDate
              prepublication
              path
              kind
              template
              color
              format {
                id
                meta {
                  path
                  title
                  color
                  kind
                }
              }
            }
          }
        }
      }
    }
  }
`

export const withFeedData = graphql(feedQuery, {
  options: ({
    priorRepoIds,
    excludeRepoIds: excludeRepoIdsCS = '',
    minPublishDate,
    lastPublishedAt
  }) => {
    const excludeRepoIds = [
      ...priorRepoIds,
      ...excludeRepoIdsCS.split(',')
    ].filter(Boolean)

    let from =
      minPublishDate ||
      (lastPublishedAt
        ? `${lastPublishedAt.split('T')[0]}T02:00:00.000Z`
        : undefined)

    return {
      variables: {
        minPublishDate: from && {
          from
        },
        filters: [
          { key: 'template', not: true, value: 'format' },
          { key: 'template', not: true, value: 'front' }
        ].concat(
          excludeRepoIds.map(repoId => ({
            key: 'repoId',
            not: true,
            value: repoId
          }))
        )
      }
    }
  }
})

export const withDiscussionsData = graphql(
  gql`
    ${TeaserActiveDebates.data.query}
  `,
  TeaserActiveDebates.data.config
)
