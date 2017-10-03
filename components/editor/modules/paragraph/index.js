import React from 'react'
import { css } from 'glamor'
import { ParagraphButton } from './ui'
import { matchBlock } from '../../utils'
import { PARAGRAPH } from './constants'
import MarkdownSerializer from '../../../../lib/serializer'
import { getSerializationRules } from '../../utils/getRules'

import marks from '../marks'
import link from '../link'

const styles = {
  paragraph: {
    margin: '0 0 0.8em'
  }
}

const isParagraph = matchBlock(PARAGRAPH)

const inlineSerializer = new MarkdownSerializer({
  rules: getSerializationRules([
    ...marks.plugins,
    ...link.plugins
  ]).concat({
    matchMdast: (node) => node.type === 'break',
    fromMdast: (node, index, parent, visitChildren) => ({
      kind: 'text',
      ranges: [{text: '\n'}]
    })
  })
})

const paragraph = {
  match: isParagraph,
  matchMdast: (node) => node.type === 'paragraph',
  fromMdast: (node, index, parent, visitChildren) => ({
    kind: 'block',
    type: PARAGRAPH,
    nodes: inlineSerializer.fromMdast(node.children)
  }),
  toMdast: (object, index, parent, visitChildren) => ({
    type: 'paragraph',
    children: inlineSerializer.toMdast(object.nodes)
  }),
  render: ({ children }) => <p {...css(styles.paragraph)}>{ children }</p>
}

export const serializer = new MarkdownSerializer({
  rules: [
    paragraph
  ]
})

export {
  PARAGRAPH,
  ParagraphButton
}

export default {
  plugins: [
    {
      onKeyDown (e, data, change) {
        const { state } = change
        if (data.key !== 'enter') return
        if (e.shiftKey === false) return

        const { startBlock } = state
        const { type } = startBlock
        if (type !== PARAGRAPH) {
          return
        }

        return change.insertText('\n')
      },
      schema: {
        rules: [
          paragraph
        ]
      }
    }
  ]
}
