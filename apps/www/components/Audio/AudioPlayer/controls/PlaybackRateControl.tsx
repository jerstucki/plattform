import { css } from 'glamor'
import {
  IconButton,
  AddIcon,
  RemoveIcon,
  fontStyles,
  mediaQueries,
  useColorContext,
} from '@project-r/styleguide'

const styles = {
  root: css({
    display: 'inline-flex',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
    [mediaQueries.sDown]: {
      gap: 8,
    },
  }),
  rate: css({
    ...fontStyles.sansSerifRegular18,
    lineHeight: '18px',
  }),
}

type PlaybackRateControl = {
  playbackRate: number
  setPlaybackRate: (playbackRate: number) => void
  availablePlaybackRates?: number[]
}

const PlaybackRateControl = ({
  playbackRate,
  setPlaybackRate,
  availablePlaybackRates = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5],
}: PlaybackRateControl) => {
  const currentIndex = availablePlaybackRates.indexOf(playbackRate)
  const [colorScheme] = useColorContext()
  return (
    <div {...styles.root}>
      <IconButton
        Icon={RemoveIcon}
        onClick={() =>
          setPlaybackRate(availablePlaybackRates[currentIndex - 1])
        }
        disabled={currentIndex === 0}
        style={{ marginRight: 0 }}
      />
      <span
        style={{ minWidth: '4ch', textAlign: 'center' }}
        {...colorScheme.set('color', 'text')}
      >
        {playbackRate}
        {'×'}
      </span>
      <IconButton
        Icon={AddIcon}
        onClick={() =>
          setPlaybackRate(availablePlaybackRates[currentIndex + 1])
        }
        disabled={currentIndex >= availablePlaybackRates.length - 1}
        style={{ marginRight: 0 }}
      />
    </div>
  )
}

export default PlaybackRateControl