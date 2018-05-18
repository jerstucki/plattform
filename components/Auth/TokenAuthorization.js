import React, { Fragment, Component } from 'react'
import { graphql, compose } from 'react-apollo'
import gql from 'graphql-tag'

import { Button, InlineSpinner, Interaction, Label, Loader, fontFamilies, colors } from '@project-r/styleguide'

import Consents, { getConstentsError } from '../Pledge/Consents'

import withT from '../../lib/withT'
import { meQuery } from '../../lib/apollo/withMe'
import { Router } from '../../lib/routes'

import ErrorMessage from '../ErrorMessage'

const { P } = Interaction

const goTo = (type, email) => Router.replaceRoute(
  'notifications',
  { type, email, context: 'authorization' }
)

const shouldAutoAuthorize = ({ target }) => {
  return target && target.session.isCurrent && !target.requiredConsents.length
}

class TokenAuthorization extends Component {
  constructor (props) {
    super(props)
    this.state = {}
  }
  authorize () {
    const {
      email,
      authorize
    } = this.props

    if (this.state.authorizing) {
      return
    }
    this.setState({
      authorizing: true
    }, () => {
      authorize({
        consents: this.state.consents
      })
        .then(() => goTo('email-confirmed', email))
        .catch(error => {
          this.setState({
            authorizing: false,
            authorizeError: error
          })
        })
    })
  }
  autoAutherize () {
    const {
      email,
      error
    } = this.props

    if (!this.state.authorizing && shouldAutoAuthorize(this.props)) {
      this.authorize()
    } else if (error) {
      goTo('invalid-token', email, error)
    }
  }
  componentDidMount () {
    this.autoAutherize()
  }
  componentDidUpdate () {
    this.autoAutherize()
  }
  render () {
    const {
      t,
      target,
      echo,
      email,
      error,
      loading
    } = this.props
    const {
      consents
    } = this.state

    return (
      <Loader loading={loading || error || shouldAutoAuthorize(this.props)} render={() => {
        const constentsError = getConstentsError(
          t,
          target.requiredConsents,
          consents
        )
        const authorizeError = this.state.authorizeError || (
          this.state.dirty && constentsError
        )

        const { country, city, ipAddress, userAgent, isCurrent } = target.session
        return (
          <Fragment>
            <P>
              {t(`tokenAuthorization/title/${target.newUser ? 'new' : 'existing'}`)}<br />
              <Label>{t('tokenAuthorization/email', { email })}</Label>
            </P>
            {!isCurrent && <div style={{margin: '20px 0'}}>
              <P>
                {t('tokenAuthorization/differentSession')}<br /><br />
                <Label>{t('tokenAuthorization/location')}</Label><br />
                <span style={
                  country !== echo.country
                    ? {
                      fontFamily: fontFamilies.sansSerifMedium,
                      color: colors.error
                    }
                    : {}
                }>
                  {country || t('tokenAuthorization/location/unknown')}
                </span><br />
                <span style={{
                  fontFamily: city !== echo.city
                    ? fontFamilies.sansSerifMedium
                    : undefined
                }}>
                  {city}
                </span>
              </P>
              <P>
                <Label>{t('tokenAuthorization/device')}</Label><br />
                <span style={{
                  fontFamily: userAgent !== echo.userAgent
                    ? fontFamilies.sansSerifMedium
                    : undefined
                }}>
                  {userAgent}
                </span>
              </P>
              {echo.ipAddress !== ipAddress && <P>
                <Label>{t('tokenAuthorization/ip')}</Label><br />
                {ipAddress}
              </P>}
            </div>}
            {!!target.requiredConsents.length && (
              <div style={{margin: '20px 0', textAlign: 'left'}}>
                <Consents
                  accepted={consents}
                  required={target.requiredConsents}
                  onChange={keys => {
                    this.setState({
                      consents: keys,
                      authorizeError: undefined
                    })
                  }} />
              </div>
            )}
            {!!authorizeError && <ErrorMessage error={authorizeError} />}
            <br />
            {this.state.authorizing
              ? <div style={{textAlign: 'center'}}><InlineSpinner /></div>
              : (
                <div style={{opacity: constentsError ? 0.5 : 1}}>
                  <Button
                    primary
                    onClick={() => {
                      if (constentsError) {
                        this.setState({dirty: true})
                        return
                      }
                      this.authorize()
                    }}>
                    {t(`tokenAuthorization/button${!isCurrent ? '/differentSession' : ''}`)}
                  </Button>
                </div>
              )}
            <br />
            <br />
            <Label>{t('tokenAuthorization/after', { email })}</Label>
          </Fragment>
        )
      }} />
    )
  }
}

const authorizeSession = gql`
  mutation authorizeSession($email: String!, $tokens: [SignInToken!]!, $consents: [String!]) {
    authorizeSession(email: $email, tokens: $tokens, consents: $consents)
  }
`

const unauthorizedSessionQuery = gql`
  query unauthorizedSession($email: String!, $token: String!) {
    echo {
      ipAddress
      userAgent
      country
      city
    }
    target: unauthorizedSession(email: $email, token: {type: EMAIL_TOKEN, payload: $token}) {
      newUser
      enabledSecondFactors
      requiredConsents
      session {
        ipAddress
        userAgent
        country
        city
        isCurrent
      }
    }
  }
`

export default compose(
  withT,
  graphql(authorizeSession, {
    props: ({ ownProps: { email, token }, mutate }) => ({
      authorize: ({consents} = {}) => mutate({
        variables: {
          email,
          tokens: [
            {type: 'EMAIL_TOKEN', payload: token}
          ],
          consents
        },
        refetchQueries: [{query: meQuery}]
      })
    })
  }),
  graphql(unauthorizedSessionQuery, {
    props: ({ data }) => {
      return {
        target: data.target,
        echo: data.echo,
        loading: data.loading,
        error: data.error
      }
    },
    options: {
      // no server rendering for proper echo
      ssr: false
    }
  })
)(TokenAuthorization)
