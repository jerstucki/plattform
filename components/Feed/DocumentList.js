import React from 'react'
import { compose } from 'react-apollo'
import { css } from 'glamor'
import withT from '../../lib/withT'
import PropTypes from 'prop-types'
import withInNativeApp from '../../lib/withInNativeApp'

import { A, Spinner, Interaction } from '@project-r/styleguide'
import Feed from './Feed'

import ErrorMessage from '../ErrorMessage'

import { useInfiniteScroll } from '../../lib/hooks/useInfiniteScroll'
import SubscribeDocumentMenu from '../Notifications/SubscribeDocumentMenu'

const styles = {
  title: css({
    alignItems: 'center',
    display: 'flex',
    paddingBottom: '2.2rem'
  }),
  more: css({
    position: 'relative',
    height: 50,
    padding: '20px 0 0 0'
  })
}

const DocumentList = ({
  documents,
  totalCount,
  hasMore,
  loadMore,
  feedProps,
  variables,
  showTotal,
  help,
  empty,
  t
}) => {
  const [
    { containerRef, infiniteScroll, loadingMore, loadingMoreError },
    setInfiniteScroll
  ] = useInfiniteScroll({ hasMore, loadMore })

  return (
    <>
      {showTotal && (
        <div {...styles.title}>
          <Interaction.H2>
            {t.pluralize('feed/title', {
              count: totalCount
            })}
          </Interaction.H2>
          {variables && variables.formatId ? (
            <SubscribeDocumentMenu
              subscription={variables.subscription}
              format={{
                id: variables.formatId,
                meta: { title: variables.formatName }
              }}
            />
          ) : null}
        </div>
      )}
      {help}
      {!documents.length && empty}
      <div ref={containerRef}>
        <Feed documents={documents} {...feedProps} />
      </div>
      <div {...styles.more}>
        {loadingMoreError && <ErrorMessage error={loadingMoreError} />}
        {loadingMore && <Spinner />}
        {!infiniteScroll && hasMore && (
          <A
            href='#'
            onClick={event => {
              event && event.preventDefault()
              setInfiniteScroll(true)
            }}
          >
            {t('feed/loadMore', {
              count: documents.length,
              remaining: totalCount - documents.length
            })}
          </A>
        )}
      </div>
    </>
  )
}

DocumentList.propTypes = {
  documents: PropTypes.array.isRequired,
  totalCount: PropTypes.number.isRequired,
  loadMore: PropTypes.func.isRequired,
  hasMore: PropTypes.bool,
  t: PropTypes.func.isRequired,
  feedProps: PropTypes.object,
  variables: PropTypes.object,
  showTotal: PropTypes.bool,
  help: PropTypes.element
}

export default compose(withT, withInNativeApp)(DocumentList)
