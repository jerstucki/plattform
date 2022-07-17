import { css, merge } from 'glamor'
import compose from 'lodash/flowRight'

import { Button, A, InlineSpinner } from '@project-r/styleguide'

import withT from '../../lib/withT'

const styles = {
  actions: css({
    margin: '15px 0',
    '& button': {
      margin: '5px 10px 5px 0',
    },
  }),
}

export default compose(withT)(({ t, onSubmit, onReset, updating, invalid }) => {
  return (
    <div {...styles.actions}>
      <Button primary onClick={onSubmit} disabled={updating || invalid}>
        {updating ? <InlineSpinner size={40} /> : t('questionnaire/submit')}
      </Button>
      {!!onReset && (
        <Button
          onClick={() => {
            if (window.confirm(t('questionnaire/reset/confirm'))) {
              onReset()
            }
          }}
          naked
        >
          {invalid ? t('questionnaire/invalid') : t('questionnaire/reset')}
        </Button>
      )}
    </div>
  )
})
