import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  ApolloClientOptions,
  useApollo as useApolloHook,
  initializeApollo as initializeApolloFunc,
} from './apolloClient'
import makeWithApollo from './withApollo'

/**
 * Options that must only be provided once per application.
 */
type CreateApolloClientUtilitiesOptions = Pick<
  ApolloClientOptions,
  'apiUrl' | 'wsUrl' | 'mobileConfigOptions'
>

/**
 * Factory function that returns all needed utilities for the Apollo Client
 * with the application specific options.
 * @param options Options that must only be provided once per application.
 */
export function createApolloClientUtilities(
  options: CreateApolloClientUtilitiesOptions,
) {
  const useApollo = <P>(
    pageProps: P,
    providedApolloClient: ApolloClient<NormalizedCacheObject>,
  ): ApolloClient<NormalizedCacheObject> =>
    useApolloHook<P>(pageProps, {
      ...options,
      providedApolloClient,
    })

  const initializeApollo = (
    initialCacheObject: NormalizedCacheObject = null,
    {
      headers,
      onResponse,
    }: Pick<ApolloClientOptions, 'headers' | 'onResponse'>,
  ): ApolloClient<NormalizedCacheObject> =>
    initializeApolloFunc(initialCacheObject, {
      ...options,
      headers,
      onResponse,
    })

  const withApollo = makeWithApollo(useApollo)

  return {
    useApollo,
    initializeApollo,
    withApollo,
  }
}

export { hasSubscriptionOperation } from './apolloLink'
export { APOLLO_STATE_PROP_NAME } from './apolloClient'
export type { PagePropsWithApollo } from './withApollo'
