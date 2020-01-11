import React from 'react'
import {
  Interaction,
  Center,
  mediaQueries,
  Button,
  colors,
  fontStyles,
  linkRule,
  RawHtml
} from '@project-r/styleguide'
import TrialForm from '../Trial/Form'
import { css } from 'glamor'
import { getElementFromSeed } from '../../lib/utils/helpers'
import { trackEventOnClick } from '../../lib/piwik'
import { Router, routes } from '../../lib/routes'
import NativeRouter, { withRouter } from 'next/router'
import { compose, graphql } from 'react-apollo'
import withT from '../../lib/withT'
import withInNativeApp from '../../lib/withInNativeApp'
import gql from 'graphql-tag'
import { countFormat } from '../../lib/utils/format'
import withMemberStatus from '../../lib/withMemberStatus'
import { TRIAL_CAMPAIGNS, TRIAL_CAMPAIGN } from '../../lib/constants'
import { parseJSONObject } from '../../lib/safeJSON'

const trailCampaignes = parseJSONObject(TRIAL_CAMPAIGNS)
const trialAccessCampaignId =
  (trailCampaignes.paynote && trailCampaignes.paynote.accessCampaignId) ||
  TRIAL_CAMPAIGN

const styles = {
  banner: css({
    padding: '5px 0'
  }),
  body: css({
    margin: 0,
    paddingBottom: 0
  }),
  cta: css({
    marginTop: 10
  }),
  actions: css({
    display: 'flex',
    flexDirection: 'column',
    [mediaQueries.mUp]: {
      alignItems: 'center',
      flexDirection: 'row'
    }
  }),
  aside: css({
    marginTop: 15,
    color: colors.lightText,
    ...fontStyles.sansSerifRegular16,
    '& a': linkRule,
    [mediaQueries.mUp]: {
      ...fontStyles.sansSerifRegular18,
      marginLeft: 30,
      marginTop: 0
    }
  })
}

const memberShipQuery = gql`
  query payNoteMembershipStats {
    membershipStats {
      count
    }
  }
`

export const TRY_TO_BUY_RATIO = 0.5

const TRY_VARIATIONS = ['191106-v2', '191106-v3', '191106-v4']
// make sure to include in MAX_PAYNOTE_SEED if you add one with more
const TRY_VARIATIONS_CAMPAIGN = {
  wseww: ['191106-v1', '191106-v2-campaign-wseww', '191106-v3', '191106-v4']
}

const BUY_VARIATIONS = ['191108-v1', '191108-v2']

const BUY_SERIES = 'series'

export const MAX_PAYNOTE_SEED = Math.max(
  TRY_VARIATIONS.length,
  BUY_VARIATIONS.length
)

const goTo = route => Router.pushRoute(route).then(() => window.scrollTo(0, 0))

const getTryVariation = (seed, { query }) => {
  const variations =
    TRY_VARIATIONS_CAMPAIGN[query.campaign || query.utm_campaign] ||
    TRY_VARIATIONS
  const variation = getElementFromSeed(variations, seed)
  return {
    keyShort: variation,
    key: `article/tryNote/${variation}`,
    cta: 'try'
  }
}

const getBuyVariation = (seed, { isSeries }) => {
  const variation = isSeries
    ? BUY_SERIES
    : getElementFromSeed(BUY_VARIATIONS, seed)
  return {
    keyShort: variation,
    key: `article/payNote/${variation}`,
    cta: 'buy'
  }
}

const getPayNoteVariation = ({
  inNativeIOSApp,
  isTrialThankYou,
  isEligibleForTrial,
  isSeries,
  seed,
  trial,
  query
}) => {
  if (query.trialSignup && !isEligibleForTrial) {
    return {
      key: 'article/tryNote/thankYou',
      cta: 'try'
    }
  }
  if (inNativeIOSApp && !isEligibleForTrial) {
    return {
      key: 'article/payNote/ios'
    }
  }
  return isEligibleForTrial && (inNativeIOSApp || trial)
    ? getTryVariation(seed, { query })
    : getBuyVariation(seed, { query, isSeries })
}

const Translation = compose(
  withT,
  graphql(memberShipQuery)
)(({ t, data: { membershipStats }, baseKey, position, element }) => {
  const tKey = [baseKey, position, element].filter(el => el).join('/')
  const count = countFormat((membershipStats && membershipStats.count) || 20000)
  return (
    <RawHtml
      dangerouslySetInnerHTML={{
        __html: t(tKey, { count: count }, '')
      }}
    />
  )
})

const BuyButton = ({ variation, position }) => {
  return (
    <Button
      primary
      onClick={trackEventOnClick(
        ['PayNote', `pledge ${position}`, variation.key],
        () => goTo('pledge')
      )}
    >
      <Translation
        baseKey={variation.key}
        position={position}
        element='buy/button'
      />
    </Button>
  )
}

const TrialLink = compose(withT)(({ t, variation }) => {
  const tKey = 'article/payNote/secondaryAction'
  return (
    <div {...styles.aside}>
      {t.elements(`${tKey}/text`, {
        link: (
          <a
            key='trial'
            href={routes.find(r => r.name === 'trial').toPath()}
            onClick={trackEventOnClick(
              ['PayNote', 'preview after', variation],
              () => goTo('trial')
            )}
          >
            {t(`${tKey}/linkText`)}
          </a>
        )
      })}
    </div>
  )
})

const BuyNoteCta = compose(withMemberStatus)(
  ({ isEligibleForTrial, variation, position }) => {
    return (
      <div {...styles.actions}>
        <BuyButton variation={variation} position={position} />
        {isEligibleForTrial && position === 'after' && (
          <TrialLink variation={variation} />
        )}
      </div>
    )
  }
)

const TryNoteCta = compose(withRouter)(({ router, darkMode, payload }) => {
  return (
    <TrialForm
      beforeSignIn={() => {
        // use native router for shadow routing
        NativeRouter.push(
          {
            pathname: '/article',
            query: { ...router.query, trialSignup: 1 }
          },
          router.asPath,
          { shallow: true }
        )
      }}
      onSuccess={() => {
        return false
      }}
      accessCampaignId={trialAccessCampaignId}
      payload={payload}
      darkMode={darkMode}
      minimal
    />
  )
})

const PayNoteCta = ({ variation, payload, position, darkMode }) => {
  return (
    <div {...styles.cta}>
      {variation.cta === 'try' ? (
        <TryNoteCta darkMode={darkMode} payload={payload} />
      ) : (
        <BuyNoteCta variation={variation} position={position} />
      )}
    </div>
  )
}

export const PayNote = compose(
  withRouter,
  withInNativeApp,
  withMemberStatus
)(
  ({
    router: { query },
    inNativeIOSApp,
    isEligibleForTrial,
    seed,
    trial,
    documentId,
    repoId,
    series,
    position
  }) => {
    const variation = getPayNoteVariation({
      inNativeIOSApp,
      isEligibleForTrial,
      series,
      trial,
      seed,
      query
    })
    const lead = (
      <Translation
        baseKey={variation.key}
        position={position}
        element='title'
      />
    )
    const body = <Translation baseKey={variation.key} position={position} />
    const payload = {
      documentId,
      repoId,
      variation: variation.keyShort,
      position
    }
    const isBefore = position === 'before'
    const cta = !!variation.cta && (
      <PayNoteCta
        darkMode={isBefore}
        variation={variation}
        payload={payload}
        position={position}
      />
    )

    return (
      <div
        {...styles.banner}
        style={{
          backgroundColor: isBefore
            ? colors.negative.primaryBg
            : colors.primaryBg
        }}
      >
        <Center>
          <Interaction.P
            {...styles.body}
            style={{ color: isBefore ? colors.negative.text : '#000000' }}
          >
            <Interaction.Emphasis>{lead}</Interaction.Emphasis> {body}
          </Interaction.P>
          {cta}
        </Center>
      </div>
    )
  }
)
