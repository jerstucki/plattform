import React from 'react'

import {
  Overlay, OverlayBody,
  OverlayToolbar, OverlayToolbarConfirm,
  Interaction, Label, Slider
} from '@project-r/styleguide'

import MdClose from 'react-icons/lib/md/close'
import withT from '../../lib/withT'
import { compose } from 'react-apollo'

import { DEFAULT_FONT_SIZE, useFontSize } from '../../lib/fontSize'

const FontSizeOverlay = ({ onClose }) => {
  const [fontSize, setFontSize] = useFontSize(DEFAULT_FONT_SIZE)
  const fontPercentage = Math.round(100 * fontSize / DEFAULT_FONT_SIZE)

  return (
    <Overlay onClose={onClose} mUpStyle={{ maxWidth: 400, minHeight: 'none' }}>
      <OverlayToolbar>
        <Interaction.Emphasis style={{ padding: '15px 20px', fontSize: 16 }}>
          Adjust Font Size
        </Interaction.Emphasis>
        <OverlayToolbarConfirm
          onClick={onClose}
          label={<MdClose size={24} fill='#000' />}
        />
      </OverlayToolbar>
      <OverlayBody>
        <div>
          <Label>
            {'Font size: ' + fontPercentage + '%'}
          </Label><br />
          <Slider
            value={fontSize}
            min='8'
            max='48'
            step='1'
            title={fontPercentage + '%'}
            onChange={(e, newValue) => { setFontSize(newValue) }}
            fullWidth />
          <br />
          <br />
        </div>
      </OverlayBody>
    </Overlay>
  )
}

export default compose(withT)(FontSizeOverlay)
