import React, { Component } from 'react'
import { graphql } from '@apollo/client/react/hoc'
import { gql } from '@apollo/client'
import debounce from 'lodash/debounce'

import Autocomplete from '../../../../../../Form/Autocomplete'
import { InlineSpinner } from '../../../../../../Spinner'
import { ErrorMessage } from '../../../../../components/render/Message'

const getAuthors = gql`
  query getAuthors($search: String!) {
    users(search: $search, hasPublicProfile: true) {
      id
      name
      email
      portrait
    }
  }
`

const UserItem = ({ user }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div
      style={{
        width: 54,
        height: 54,
        backgroundColor: '#E2E8E6',
        backgroundImage: user.portrait ? `url(${user.portrait})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        marginRight: 10,
        flexShrink: 0,
      }}
    />
    <div>
      {user.lastName && (
        <span>
          {user.name}
          <br />
        </span>
      )}
      <small>{user.email}</small>
    </div>
  </div>
)

const ConnectedAutoComplete = graphql(getAuthors, {
  skip: (props) => !props.filter,
  options: ({ search }) => ({ variables: { search } }),
  props: ({ data }) => ({
    data: data,
    items:
      (!data.loading &&
        data.users &&
        data.users.slice(0, 5).map((user) => ({
          value: user,
          element: <UserItem user={user} />,
        }))) ||
      [],
  }),
})((props) => (
  <span style={{ position: 'relative', display: 'block' }}>
    <Autocomplete key='autocomplete' {...props} />
    {props.data?.loading && (
      <span
        style={{
          position: 'absolute',
          top: '21px',
          right: '0px',
          zIndex: 500,
        }}
      >
        <InlineSpinner size={35} />
      </span>
    )}
    {props.data?.error && (
      <ErrorMessage error={props.data?.error?.toString()} />
    )}
  </span>
))

class SearchUserForm extends Component {
  constructor(...args) {
    super(...args)
    this.state = {
      items: [],
      filter: '',
      search: '',
      value: null,
    }
    this.filterChangeHandler = this.filterChangeHandler.bind(this)
    this.changeHandler = this.changeHandler.bind(this)
    this.setSearchValue = debounce(this.setSearchValue.bind(this), 500)
  }

  componentWillUnmount() {
    this.setSearchValue.cancel()
  }

  setSearchValue() {
    this.setState({
      search: this.state.filter,
    })
  }

  filterChangeHandler(value) {
    this.setState(
      (state) => ({
        ...this.state,
        filter: value,
      }),
      this.setSearchValue,
    )
  }

  changeHandler(value) {
    this.setState(
      (state) => ({
        filter: null,
        value: null,
      }),
      () => this.props.onChange(value),
    )
  }

  render() {
    const { filter, value, search } = this.state
    return (
      <ConnectedAutoComplete
        label='Suchen'
        filter={filter}
        value={value}
        items={[]}
        search={search}
        onChange={this.changeHandler}
        onFilterChange={this.filterChangeHandler}
      />
    )
  }
}

export default SearchUserForm
