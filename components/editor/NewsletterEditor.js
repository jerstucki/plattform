import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Editor as SlateEditor } from 'slate-react'
import { css } from 'glamor'

import Sidebar from './Sidebar'
import MetaData from './modules/meta/ui'

import createDocumentModule from './modules/document'
import createCoverModule from './modules/cover'
import createCenterModule from './modules/center'
import createHeadlineModule from './modules/headline'
import createParagraphModule from './modules/paragraph'
import createBlockquoteModule from './modules/blockquote'
import createLinkModule from './modules/link'
import createMarkModule from './modules/mark'
import createListModule from './modules/list'
import createListItemModule from './modules/list/item'
import createFigureModule from './modules/figure'
import createFigureImageModule from './modules/figure/image'
import createSpecialModule from './modules/special'

import schema from '../Templates/Newsletter'

const moduleCreators = {
  document: createDocumentModule,
  cover: createCoverModule,
  center: createCenterModule,
  headline: createHeadlineModule,
  paragraph: createParagraphModule,
  link: createLinkModule,
  mark: createMarkModule,
  blockquote: createBlockquoteModule,
  list: createListModule,
  listItem: createListItemModule,
  figure: createFigureModule,
  figureImage: createFigureImageModule,
  special: createSpecialModule
}
const initModule = rule => {
  const { editorModule, editorOptions = {} } = rule
  if (editorModule) {
    const create = moduleCreators[editorModule]
    if (!create) {
      throw new Error(`Missing editorModule ${editorModule}`)
    }
    const TYPE = (editorOptions.type || editorModule).toUpperCase()
    const subModules = (rule.rules || [])
      .map(initModule)
      .filter(Boolean)
    const module = create({
      TYPE,
      rule,
      subModules: subModules
    })

    module.TYPE = TYPE
    module.name = editorModule
    module.subModules = subModules

    return module
  }
}

const rootRule = schema.rules[0]
const rootModule = initModule(rootRule)
// tmp, see: https://github.com/ianstormtaylor/slate/issues/1323
const RootContainer = rootModule.components.Container

export const serializer = rootModule.helpers.serializer
export const newDocument = rootModule.helpers.newDocument

const getAllModules = module => [module].concat(
  (module.subModules || []).reduce(
    (collector, subModule) => collector.concat(
      getAllModules(subModule)
    ),
    []
  )
)

const allModules = getAllModules(rootModule)
const uniqModules = allModules.filter((m, i, a) => a.findIndex(mm => mm.TYPE === m.TYPE) === i)

const getFromModules = (modules, accessor) => modules.reduce(
  (collector, m) => collector.concat(accessor(m)),
  []
).filter(Boolean)

const plugins = getFromModules(uniqModules, m => m.plugins)

const textFormatButtons = getFromModules(
  uniqModules,
  m => m.ui && m.ui.textFormatButtons
)

const blockFormatButtons = getFromModules(
  uniqModules,
  m => m.ui && m.ui.blockFormatButtons
)

const insertButtons = getFromModules(
  uniqModules,
  m => m.ui && m.ui.insertButtons
)

const propertyForms = getFromModules(
  uniqModules,
  m => m.ui && m.ui.forms
)

const styles = {
  container: css({
    width: '100%',
    paddingLeft: 170,
    position: 'relative'
  }),
  document: {
    width: '100%'
  }
}

const Container = ({ children }) => (
  <div {...styles.container}>{ children }</div>
)

const Document = ({ children }) => (
  <div {...styles.document}>{ children }</div>
)

class Editor extends Component {
  constructor (props) {
    super(props)
    this.onChange = (change) => {
      const { state, onChange, onDocumentChange } = this.props

      if (change.state !== state) {
        onChange(change)
        if (!change.state.document.equals(state.document)) {
          onDocumentChange(change.state.document, change)
        }
      }
    }
  }
  render () {
    const { state } = this.props

    return (
      <Container>
        <Sidebar
          textFormatButtons={textFormatButtons}
          blockFormatButtons={blockFormatButtons}
          insertButtons={insertButtons}
          propertyForms={propertyForms}
          state={state}
          onChange={this.onChange} />
        <Document>
          <RootContainer>
            <SlateEditor
              state={state}
              onChange={this.onChange}
              plugins={plugins} />
          </RootContainer>
          <MetaData
            state={state}
            onChange={this.onChange} />
        </Document>
      </Container>
    )
  }
}

Editor.propTypes = {
  state: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  onDocumentChange: PropTypes.func
}

Editor.defaultProps = {
  onChange: () => true,
  onDocumentChange: () => true
}

export default Editor
