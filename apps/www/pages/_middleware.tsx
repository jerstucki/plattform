import { NextRequest, NextResponse } from 'next/server'
import {
  getJWTCookieValue,
  getSessionCookieValue,
  verifyJWT,
} from '../lib/auth/JWT/JWTHelper'
import fetchMyRoles from '../lib/helpers/middleware/FetchMeObject'

/**
 * Middleware used to conditionally redirect between the marketing and front page
 * depending on the user authentication status and roles.
 * @param req
 */
export async function middleware(req: NextRequest) {
  const resUrl = req.nextUrl.clone()

  // Don't run the middleware unless on home-page
  if (resUrl.pathname !== '/') {
    return NextResponse.next()
  }

  // Redirect to front-preview ssr to generate article front-preview
  // used in the yearly overview
  if (resUrl.searchParams.has('extractId')) {
    // Remap extractId query param to id-slug
    const extractId = resUrl.searchParams.get('extractId')
    resUrl.searchParams.delete('extractId')
    resUrl.pathname = `/_ssr/front/${extractId}`
    return NextResponse.rewrite(resUrl)
  }

  /* ------------ Logic to handle SSG front- & marketing-page ------------ */

  /**
   * Rewrite to the front if the user is a memeber
   * @param roles Roles of the user
   * @returns NextResponse
   */
  async function rewriteBasedOnRoles(
    roles: string[] = [],
  ): Promise<NextResponse> {
    if (roles?.includes('member')) {
      resUrl.pathname = '/front'
      return NextResponse.rewrite(resUrl)
    }
    return NextResponse.next()
  }

  /**
   * Load me from the API and rewrite according to the loaded me object.
   * Also add the set-cookie header to the response.
   * @param req
   * @returns
   */
  async function rewriteBasedOnMe(req: NextRequest): Promise<NextResponse> {
    const { me, cookie } = await fetchMyRoles(req)

    const response: NextResponse =
      me && me.roles ? await rewriteBasedOnRoles(me.roles) : NextResponse.next()

    response.headers.set('Set-Cookie', cookie)
    return response
  }

  /**
   * Redirect based on the jwt-token after it was successfully validated
   * @param token JWT found in the cookie header
   * @returns NextResponse
   */
  async function rewriteBasedOnToken(token: string): Promise<NextResponse> {
    try {
      // Parse and verify JWT to decide about redirection
      const jwtBody = await verifyJWT(token)

      if (jwtBody && jwtBody.roles) {
        return rewriteBasedOnRoles(jwtBody.roles)
      } else {
        // in case of empty jwt-payload -> expired session-cookie
        return NextResponse.next()
      }
    } catch (err) {
      // Rewrite to gateway to fetch a new valid JWT
      console.error('JWT Verification Error', err)
      // Rewrite based on fetched me object
      return rewriteBasedOnMe(req)
    }
  }

  const sessionCookie = getSessionCookieValue(req)
  const tokenCookie = getJWTCookieValue(req)

  if (sessionCookie && tokenCookie) {
    // Rewrite based on token
    return rewriteBasedOnToken(tokenCookie)
  } else if (sessionCookie) {
    // Rewrite if no JWT is present
    return rewriteBasedOnMe(req)
  }

  return NextResponse.next()
}
