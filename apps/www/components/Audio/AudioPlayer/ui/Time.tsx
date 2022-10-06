import { renderTime } from '../shared'
import React from 'react'
import { css } from 'glamor'
import { fontStyles, useColorContext } from '@project-r/styleguide'

const styles = {
  time: css({
    ...fontStyles.sansSerifRegular14,
    fontFeatureSettings: '"tnum" 1, "kern" 1',
    margin: 0,
  }),
}

type TimeProps = {
  currentTime?: number
  duration?: number
}

const Time = ({ currentTime, duration }: TimeProps) => {
  const [colorScheme] = useColorContext()
  return (
    <span {...styles.time} {...colorScheme.set('color', 'textSoft')}>
      {renderTime(currentTime || 0)} / {renderTime(duration || 0)}
    </span>
  )
}

export default Time
