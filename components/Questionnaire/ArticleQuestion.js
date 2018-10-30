import React, { Component } from 'react'
import gql from 'graphql-tag'
import { compose, withApollo } from 'react-apollo'
import Close from 'react-icons/lib/md/close'
import { css } from 'glamor'
import debounce from 'lodash.debounce'
import uuid from 'uuid/v4'

import {
  Autocomplete,
  colors,
  fontStyles,
  Interaction,
  mediaQueries
} from '@project-r/styleguide'

import questionStyles from './questionStyles'
import withT from '../../lib/withT'

const { H2, H3, P } = Interaction

const renderCredits = (node) => {
  if (node.type === 'text') {
    return node.value.trim()
  } else {
    if (node.children) {
      return node.children.map(renderCredits)
    }
  }
}

const styles = {
  previewTitle: css({
    ...fontStyles.serifTitle22,
    lineHeight: '24px'
  }),
  previewCredits: css({
    ...fontStyles.sansSerifRegular14,
    [mediaQueries.mUp]: {
      ...fontStyles.sansSerifRegular16
    }
  })
}

const ArticleItem = ({ title, credits }) =>
  <div>
    <H3 {...styles.previewTitle}>{title}</H3>
    <div {...styles.previewCredits}>{credits && credits.map(renderCredits).join(' ')}</div>
  </div>

class ArticleQuestion extends Component {
  constructor (props) {
    super(props)
    this.state = {
      filter: '',
      items: [],
      answerId: (props.question.userAnswer && props.question.userAnswer.id) || uuid(),
      ...this.deriveStateFromProps(props)
    }
  }

  handleChange = (value) => {
    const { onChange } = this.props
    const { answerId } = this.state
    if (!value) {
      this.setState({ value: null, document: null }, () => onChange(answerId, null))
    } else {
      this.setState({ value }, () => onChange(answerId, value.value))
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.question.userAnswer !== this.props.question.userAnswer) {
      this.setState(this.deriveStateFromProps(nextProps))
    }
  }

  deriveStateFromProps (props) {
    return { value: props.question.userAnswer ? props.question.userAnswer.payload : null }
  }

  renderSelectedItem = () => {
    const { value: { document } } = this.state
    return (
      <div {...css({
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingBottom: 15,
        borderBottom: `1px solid ${colors.disabled}`
      })}>
        <ArticleItem title={document.title}
          credits={document.credits} />
        <div
          {...css({
            width: 24
          })}
          onClick={() => this.handleChange(null)}><Close size={24} /></div>
      </div>
    )
  }

  handleFilterChange = (filter) => {
    this.performSearch.cancel()
    if (filter.length < 3) {
      this.setState({ filter, items: [] })
    } else {
      this.setState({ filter }, () => this.performSearch(filter))
    }
  }

  performSearch = debounce((search) => {
    const { client } = this.props
    client.query({
      query,
      variables: {
        search,
        'sort': {
          'key': 'relevance'
        },
        filters: [
          {
            'key': 'template',
            'value': 'article'
          },
          {
            'key': 'template',
            'value': 'front',
            'not': true
          }
        ]
      }
    }).then(res => {
      const items = res.data ? res.data.search.nodes
        .filter(n => n.entity)
        .map(n => ({
          document: {
            title: n.entity.meta.title,
            credits: n.entity.meta.credits
          },
          text: <ArticleItem title={n.entity.meta.title} credits={(n.entity.meta.credits || [])} />,
          value: n.entity.meta.path
        })) : []
      this.setState({ items })
    })
  }, 200)

  render () {
    const { question: { text }, t } = this.props
    const { value, items } = this.state
    return (
      <div>
        <div {...questionStyles.label}>
          { text &&
            <H2>{text}</H2>
          }
          <P {...questionStyles.help}>{t('questionnaire/article/help')}</P>
        </div>

        <div {...questionStyles.body}>
          {
            value ? (
              this.renderSelectedItem()
            ) : (
              <Autocomplete
                label={t('questionnaire/article/label')}
                items={items}
                onChange={this.handleChange}
                onFilterChange={this.handleFilterChange}
              />
            )
          }
        </div>
      </div>
    )
  }
}

const query = gql`
query getSearchResults($search: String, $after: String, $sort: SearchSortInput, $filters: [SearchGenericFilterInput!], $trackingId: ID) {
  search(first: 5, after: $after, search: $search, sort: $sort, filters: $filters, trackingId: $trackingId) {
    nodes {
      entity {
        __typename
        ... on Document {
          meta {
            title
            path
            credits
          }
        }
      }
    }
  }
}
`

export default compose(
  withT,
  withApollo
)(ArticleQuestion)
