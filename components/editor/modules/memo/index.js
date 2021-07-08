import React, { useState, useEffect } from 'react'
import { css } from 'glamor'
import MarkdownSerializer from 'slate-mdast-serializer'
import AutosizeInput from 'react-textarea-autosize'
import MemoIcon from 'react-icons/lib/md/comment'

import {
  Field,
  useColorContext,
  fontStyles,
  IconButton
} from '@project-r/styleguide'

import {
  CloseIcon,
  EditIcon,
  RemoveIcon,
  CheckIcon
} from '@project-r/styleguide/icons'

import { matchInline, createInlineButton, buttonStyles } from '../../utils'

const fadeIn = css.keyframes('fadeIn', {
  '0%': { opacity: 0 },
  '100%': { opacity: 1 }
})

const styles = {
  contextMenu: css({
    position: 'absolute',
    top: 25,
    padding: 8,
    cursor: 'pointer',
    opacity: 0,
    animation: `${fadeIn} 150ms ease-in 150ms`,
    animationFillMode: 'forwards',
    zIndex: 1,
    borderRadius: 4,
    ...fontStyles.sansSerifRegular16
  }),
  contextMenuContainer: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end'
  }),
  editButton: css({
    position: 'absolute',
    left: -40,
    marginTop: -30,
    ':hover': {
      cursor: 'pointer'
    }
  }),
  autoSize: css({
    paddingTop: '7px !important',
    paddingBottom: '6px !important'
  }),
  marker: css({
    borderRadius: '100%',
    marginLeft: 16,
    width: 20,
    height: 20,
    verticalAlign: 'middle'
  })
}

const markerColors = {
  yellow: [255, 255, 0],
  pink: [255, 0, 255],
  green: [0, 255, 0],
  blue: [0, 255, 255]
}

const getMarkerColor = color => {
  return markerColors[color] || [255, 255, 0]
}

const serialize = string => {
  try {
    return JSON.stringify(string)
  } catch (e) {
    console.warn('Unable to serialize string', { string })
    return string
  }
}

const deserialize = json => {
  try {
    return JSON.parse(json || '""')
  } catch (e) {
    console.warn('Unable to deserialize json', { json })
    return json
  }
}

const Memo = ({ editor, node, children, isSelected }) => {
  const [colorScheme] = useColorContext()
  const [isEditing, setIsEditing] = useState(false)
  const [memoRef, setMemoRef] = useState()
  const [memo, setMemo] = useState()
  const [color, setColor] = useState()
  const [dirty, setDirty] = useState()

  // If Memo is untouched – flag is missing – open overlay.
  useEffect(() => {
    !node.data.get('touched') && open()
  }, [node.data.get('touched')])

  useEffect(() => {
    if (memoRef) {
      memoRef.focus()
      memoRef.setSelectionRange(memoRef.value.length, memoRef.value.length)
    }
  }, [memoRef])

  const change = (e, value) => {
    e?.preventDefault?.()

    setMemo(value)
    value !== memo && setDirty(true)
  }

  const colorize = color => e => {
    e?.preventDefault?.()

    setColor(color)
    editor.change(change => {
      change.setNodeByKey(node.key, {
        data: node.data.merge({
          color
        })
      })
    })
  }

  const submit = e => {
    e?.preventDefault?.()

    editor.change(change => {
      change.setNodeByKey(node.key, {
        data: node.data.merge({
          memo: serialize(memo),
          touched: true
        })
      })
    })

    !memo.length && remove()
  }

  const open = e => {
    e?.preventDefault?.()

    setMemo(deserialize(node.data.get('memo')))
    setDirty(false)
  }

  const remove = e => {
    e?.preventDefault?.()

    editor.change(change => {
      change.unwrapInline(node.type)
    })
  }

  return (
    <>
      <span
        style={{
          backgroundColor: isSelected
            ? `rgb(${getMarkerColor(color).join(',')},0.8)`
            : `rgba(${getMarkerColor(color).join(',')},0.4)`,
          paddingTop: '.2em',
          paddingBottom: '.2em'
        }}
        onDoubleClick={open}
      >
        {children}
      </span>
      {isSelected && (
        <span
          {...styles.contextMenu}
          {...colorScheme.set('boxShadow', 'overlayShadow')}
          style={{
            backgroundColor: `rgb(${getMarkerColor(color).join(',')})`
          }}
        >
          <div>
            <div {...styles.contextMenuContainer} style={{}}>
              {Object.keys(markerColors).map((markerColor, index) => (
                <div
                  key={`marker-color-${index}`}
                  {...styles.marker}
                  style={{
                    backgroundColor: `rgb(${getMarkerColor(markerColor).join(
                      ','
                    )})`,
                    border: color === markerColor ? '1px solid' : 'none'
                  }}
                  onClick={colorize(markerColor)}
                />
              ))}
            </div>
            {!isEditing ? (
              <div>{memo}</div>
            ) : (
              <Field
                ref={setMemoRef}
                label={'Memo'}
                name='memo'
                value={memo}
                onChange={change}
                renderInput={({ ref, ...inputProps }) => (
                  <AutosizeInput
                    {...inputProps}
                    {...styles.autoSize}
                    inputRef={ref}
                  />
                )}
              />
            )}
          </div>
          <div {...styles.contextMenuContainer}>
            {isEditing && (
              <IconButton
                onClick={submit}
                Icon={CheckIcon}
                label={memo?.length ? 'Übernehmen' : 'Entfernen'}
              />
            )}
            <IconButton
              onClick={() => setIsEditing(!isEditing)}
              Icon={isEditing ? CloseIcon : EditIcon}
              label={isEditing ? 'abbrechen' : 'editieren'}
            />
            <IconButton onClick={remove} Icon={RemoveIcon} label='löschen' />
          </div>
        </span>
      )}
    </>
  )
}

const MemoModule = ({ rule, TYPE }) => {
  const memo = {
    match: matchInline(TYPE),
    matchMdast: rule.matchMdast,
    fromMdast: (node, index, parent, { visitChildren, context }) => {
      console.log('fromMdast', { node, data: node.data, memo: node.data?.memo })

      return {
        kind: 'inline',
        type: TYPE,
        data: {
          ...node.data,
          touched: true
        },
        nodes: visitChildren(node)
      }
    },
    toMdast: (object, index, parent, { visitChildren }) => {
      console.log('toMdast', { object })

      return {
        type: 'span',
        data: {
          type: TYPE,
          memo: object.data?.memo
        },
        children: visitChildren(object)
      }
    }
  }

  const serializer = new MarkdownSerializer({
    rules: [memo]
  })

  return {
    TYPE,
    helpers: {
      serializer
    },
    ui: {
      textFormatButtons: [
        createInlineButton({
          type: TYPE,
          parentTypes: rule.editorOptions?.parentTypes
        })(({ active, disabled, visible, ...props }) => (
          <span
            {...buttonStyles.mark}
            {...props}
            data-active={active}
            data-disabled={disabled}
            data-visible={visible}
          >
            <MemoIcon />
          </span>
        ))
      ]
    },
    plugins: [
      {
        renderNode(props) {
          const { children, ...rest } = props
          if (!memo.match(rest.node)) return

          return <Memo {...rest}>{children}</Memo>
        }
      }
    ]
  }
}

export default MemoModule
