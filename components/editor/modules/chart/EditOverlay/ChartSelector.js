import React, { useContext, useState } from 'react'
import {
  Label,
  fontStyles,
  AccordionContext,
  plainButtonRule,
  Button,
  A,
  Interaction
} from '@project-r/styleguide'
import { baseCharts } from '../config'
import { css } from 'glamor'
import { JSONEditor, PlainEditor } from '../../../utils/CodeEditorFields'
import BackIcon from 'react-icons/lib/md/chevron-left'

const styles = {
  chartWrapper: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridAutoRows: 120
  }),
  chartButtonContainer: css({
    height: '100%',
    display: 'flex'
  }),
  chartButton: css({
    height: '100%',
    width: 130,
    whiteSpace: 'nowrap',
    padding: '30px 10px',
    textAlign: 'center',
    ...fontStyles.sansSerifRegular14,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }),
  chartImage: css({
    maxWidth: 60,
    maxHeight: 40
  }),
  chartButtonText: css({
    display: 'block',
    marginTop: 'auto'
  }),
  chartPreviewContainer: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridGap: 20,
    marginTop: 20
  }),
  discreteButton: css({
    display: 'block',
    marginBottom: 30,
    ':hover': {
      textDecoration: 'underline'
    }
  }),
  buttons: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  })
}

const ChartPreview = ({ CsvChart, chart }) => {
  const values = chart.values.trim()
  return (
    <>
      <Interaction.P>{chart.config.type}</Interaction.P>
      <div {...styles.chartPreviewContainer}>
        <div style={{ marginTop: 5 }}>
          <CsvChart config={chart.config} values={values} />
        </div>
        <div>
          <PlainEditor
            label='Datenstruktur'
            value={values}
            linesShown={3}
            readOnly
          />
          <JSONEditor
            label='Einstellungen'
            config={chart.config}
            linesShown={10}
            readOnly
          />
        </div>
      </div>
    </>
  )
}

const ChartSelector = ({ onChange, data, CsvChart }) => {
  const [preselected, preselect] = useState()
  const { setActiveItemIndex } = useContext(AccordionContext)
  const config = data.get('config') || {}
  const nextAccordionItem = () => setActiveItemIndex('dataInput')
  const onSelect = (chart, configOnly = false) => {
    onChange(
      data
        .set('config', {
          ...chart.config,
          size: config.size
        })
        .set('values', configOnly ? data.get('values') : chart.values.trim())
    )
    preselect(undefined)
    nextAccordionItem()
  }
  const hasChanges = data.get('values') != '' || !!config.type
  return preselected ? (
    <>
      <Label>
        <button
          {...plainButtonRule}
          {...styles.discreteButton}
          onClick={() => preselect(undefined)}
        >
          <BackIcon size={16} /> Vorlage durchsuchen
        </button>
      </Label>
      <ChartPreview
        chart={preselected}
        CsvChart={CsvChart}
        onSelect={onSelect}
      />
      <div {...styles.buttons}>
        <Button onClick={() => onSelect(preselected)}>Überschreiben</Button>
        <Interaction.P style={{ marginLeft: 30 }}>
          <A href='#copy-settings' onClick={() => onSelect(preselected, true)}>
            Einstellungen kopieren
          </A>
        </Interaction.P>
      </div>
    </>
  ) : (
    <div {...styles.chartWrapper}>
      {baseCharts.map(chart => {
        return (
          <div key={chart.name} {...styles.chartButtonContainer}>
            <div
              {...styles.chartButton}
              {...styles.discreteButton}
              onClick={() => (hasChanges ? preselect(chart) : onSelect(chart))}
            >
              <img src={chart.screenshot} {...styles.chartImage} />
              <span {...styles.chartButtonText}>{chart.name}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ChartSelector
