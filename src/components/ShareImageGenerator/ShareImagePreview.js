import React from 'react'
import { css } from 'glamor'
import { fontFamilies, fontStyles } from '../../theme/fonts'

const WIDTH = 1200
const HEIGHT = 628

const styles = {
  container: css({
    transform: `scale(${0.5})`,
    transformOrigin: '0 0',
    marginBottom: -HEIGHT / 2,
    position: 'relative',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 48,
    overflow: 'hidden'
  }),
  kolumnenContainer: css({
    alignItems: 'flex-end'
  }),
  textContainer: css({
    width: '100%',
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    fontFamily: fontFamilies.serifBold,
    fontWeight: 700,
    zIndex: 1
  }),
  formatTitle: css({
    fontFamily: fontFamilies.sansSerifMedium,
    marginBottom: 18,
    fontSize: 44,
    width: '100%',
    textAlign: 'center',
    zIndex: 1
  }),
  formatImage: css({
    height: 260,
    zIndex: 1
  })
}

const formatFonts = {
  scribble: fontStyles.cursiveTitle,
  editorial: fontStyles.serifBold,
  meta: fontStyles.sansSerifRegular
}

const columnImageJustify = {
  top: 'flex-start',
  bottom: 'flex-end'
}

const ShareImagePreview = ({
  format,
  text = 'Text für Social Image',
  fontSize,
  coloredBackground,
  backgroundImage,
  textPosition,
  customFontStyle
}) => {
  const fontStyle = customFontStyle || formatFonts[format?.kind]
  const isColumn = format?.type === 'Kolumnen'
  const columnImage =
    isColumn &&
    backgroundImage &&
    (coloredBackground ? format?.shareImageColor : format?.shareImage)

  return (
    <div
      {...styles.container}
      {...(columnImage && styles.kolumnenContainer)}
      style={{
        backgroundImage: columnImage && `url(${columnImage})`,
        backgroundSize: 'cover',
        backgroundColor: coloredBackground ? format?.color : '#FFF',
        justifyContent:
          (columnImage && columnImageJustify[textPosition]) || 'center'
      }}
    >
      {format?.image && <img {...styles.formatImage} src={format?.image} />}
      {format?.title && (
        <div
          {...styles.formatTitle}
          style={{
            color: coloredBackground ? '#FFF' : format?.color,
            width: columnImage && '80%'
          }}
        >
          {format.title}
        </div>
      )}
      <div
        {...styles.textContainer}
        style={{
          ...(fontStyle && fontStyle),
          fontSize,
          color: coloredBackground ? '#FFF' : '#000',
          width: columnImage && '80%'
        }}
      >
        {text}
      </div>
    </div>
  )
}

export default ShareImagePreview
