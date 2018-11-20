import React, { Component, Fragment } from 'react'
import { css } from 'glamor'
import { compose, graphql } from 'react-apollo'
import gql from 'graphql-tag'
import AutosizeInput from 'react-textarea-autosize'

import { timeFormat } from '../../../lib/utils/format'
import withT from '../../../lib/withT'
import { errorToString } from '../../../lib/utils/errors'
import { Content, MainContainer } from '../../Frame'
import ErrorMessage from '../../ErrorMessage'
import { Item, P, A } from '../Elements'

import { Link } from '../../../lib/routes'

import {
  Loader, Field, Radio, Button, Interaction, InlineSpinner
} from '@project-r/styleguide'

import myBelongings from '../belongingsQuery'

const dayFormat = timeFormat('%d. %B %Y')

export const styles = {
  autoSize: css({
    minHeight: 40,
    paddingTop: '7px !important',
    paddingBottom: '6px !important',
    background: 'transparent'
  })
}

const cancellationCategories = gql`
query cancellationCategories {
  cancellationCategories {
    type
    label
  }
}`

const cancelMembership = gql`
mutation cancelMembership($id: ID!, $details: CancellationInput!) {
  cancelMembership(id: $id, details: $details) {
    id
    active
    renew
  }
}
`

class CancelMembership extends Component {
  constructor (...args) {
    super(...args)
    this.state = {
      isCancelling: false,
      isCancelled: false,
      cancellationType: '',
      reason: '',
      remoteError: null
    }
  }

  render () {
    const { loading, error, membership, cancellationCategories, t } = this.props
    const { isCancelled, isCancelling, remoteError, cancellationType, reason } = this.state
    return (
      <MainContainer>
        <Content>
          <Loader
            loading={loading}
            error={
              error ||
              (!membership && !loading &&
                t('pages/account/cancel/notFound'))}
            render={() => {
              const latestPeriod = membership.periods[0]
              const formattedEndDate = latestPeriod && dayFormat(new Date(latestPeriod.endDate))
              if (isCancelled) {
                return <Fragment>
                  <Interaction.H1>{t('pages/account/cancel/title')}</Interaction.H1>
                  <Interaction.P>{t('pages/account/cancel/confirmation')}</Interaction.P>
                  <Link route='account' passHref>
                    <A>{t('memberships/manage/cancel/accountLink')}</A>
                  </Link>
                </Fragment>
              }
              return (
                <Fragment>
                  <Interaction.H1>{t('pages/account/cancel/title')}</Interaction.H1>
                  {remoteError && <ErrorMessage error={remoteError} />}
                  <Item
                    createdAt={new Date(membership.createdAt)}
                    title={t(
                      `memberships/title/${membership.type.name}`,
                      {
                        sequenceNumber: membership.sequenceNumber
                      })}
                  >
                    {!!latestPeriod && <P>
                      {membership.active && !membership.overdue && t.first(
                        [
                          `memberships/${membership.type.name}/latestPeriod/renew/${membership.renew}`,
                          `memberships/latestPeriod/renew/${membership.renew}`
                        ],
                        { formattedEndDate },
                        ''
                      )}
                    </P>
                    }
                  </Item>
                  <Interaction.P style={{ marginBottom: '30px' }}>{t('pages/account/cancel/info')}</Interaction.P>
                  {cancellationCategories.map(({ type, label }) => (
                    <div key={type}>
                      <Radio
                        value={cancellationType}
                        checked={cancellationType === type}
                        onChange={() => this.setState({ cancellationType: type })}
                      >
                        {label}
                      </Radio>
                    </div>)
                  )}
                  {cancellationType === 'OTHER' &&
                    <Field
                      label={t('memberships/manage/cancel/description')}
                      value={reason}
                      renderInput={({ ref, ...inputProps }) => (
                        <AutosizeInput {...styles.autoSize}
                          {...inputProps}
                          inputRef={ref} />
                      )}
                      onChange={(_, reason) => {
                        this.setState({ reason })
                      }} />
                  }
                  <Button
                    style={{ marginTop: '30px' }}
                    primary={!isCancelling}
                    disabled={
                      isCancelling || !cancellationType
                    }
                    onClick={() => {
                      this.setState({
                        isCancelling: true
                      })
                      this.props.cancel({
                        id: membership.id,
                        immediately: true,
                        details: {
                          type: cancellationType,
                          reason
                        }
                      }).then(() => {
                        this.setState({
                          isCancelling: false,
                          isCancelled: true
                        })
                      }).catch(error => {
                        this.setState({
                          isCancelling: false,
                          remoteError: errorToString(error)
                        })
                      })
                    }}
                  >
                    {isCancelling
                      ? <InlineSpinner size={28} />
                      : t('memberships/manage/cancel/button')
                    }
                  </Button>
                  <br />
                  <Link route='account' passHref>
                    <A>{t('memberships/manage/cancel/accountLink')}</A>
                  </Link>
                </Fragment>
              )
            }} />
        </Content>
      </MainContainer>
    )
  }
}

export default compose(
  graphql(cancelMembership, {
    props: ({ mutate }) => ({
      cancel: (variables) =>
        mutate({ variables })
    })
  }),
  graphql(cancellationCategories, {
    props: ({ data, ownProps: { loading } }) => ({
      cancellationCategories: data.cancellationCategories,
      loading: loading || data.loading,
      error: data.error
    })
  }),
  graphql(myBelongings, {
    props: ({ data, ownProps: { membershipId, loading } }) => ({
      membership: data.me &&
        data.me.memberships &&
        data.me.memberships.find(v => v.id === membershipId),
      loading: loading || data.loading,
      error: data.error
    })
  }),
  withT
)(CancelMembership)
