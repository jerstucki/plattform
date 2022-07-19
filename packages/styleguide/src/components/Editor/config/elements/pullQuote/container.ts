import { ElementConfigI } from '../../../custom-types'
import { QuoteIcon } from '../../../../Icons'

export const config: ElementConfigI = {
  component: 'pullQuote',
  structure: [
    { type: 'pullQuoteText', main: true },
    { type: 'pullQuoteSource' },
  ],
  button: { icon: QuoteIcon },
}
