import { hierarchy } from 'd3-hierarchy'
import { nest } from 'd3-collection'
import { sum } from 'd3-array'
import { colors } from '@project-r/styleguide'
import { vt } from '../voteT'

export const data = [
  {
    category: vt('vote/201907/budget/redaktion'),
    label: vt('vote/201907/budget/redaktion/0'),
    pk: 1785971,
    sk: 365000,
    color: colors.discrete[0],
    more: vt('vote/201907/budget/redaktion/more')
  },
  {
    category: vt('vote/201907/budget/redaktion'),
    label: vt('vote/201907/budget/redaktion/1'),
    pk: 108885,
    sk: 4800
  },
  {
    category: vt('vote/201907/budget/redaktion'),
    label: vt('vote/201907/budget/redaktion/2'),
    pk: 0,
    sk: 120000
  },
  {
    category: vt('vote/201907/budget/redaktion'),
    label: vt('vote/201907/budget/redaktion/3'),
    pk: 174857,
    sk: 246800
  },
  {
    category: vt('vote/201907/budget/redaktion'),
    label: vt('vote/201907/budget/redaktion/4'),
    pk: 107793,
    sk: 64800
  },
  {
    category: vt('vote/201907/budget/redaktion'),
    label: vt('vote/201907/budget/redaktion/5'),
    pk: 370682,
    sk: 87200
  },
  {
    category: vt('vote/201907/budget/it'),
    label: vt('vote/201907/budget/it/0'),
    pk: 568238,
    sk: 203000,
    color: colors.discrete[1],
    more: vt('vote/201907/budget/it/more')
  },
  {
    category: vt('vote/201907/budget/it'),
    label: vt('vote/201907/budget/it/1'),
    pk: 0,
    sk: 50000
  },
  {
    category: vt('vote/201907/budget/community'),
    label: vt('vote/201907/budget/community'),
    pk: 407622,
    sk: 394000,
    color: colors.discrete[2],
    more: vt('vote/201907/budget/community/more')
  },
  {
    category: vt('vote/201907/budget/services'),
    label: vt('vote/201907/budget/services'),
    pk: 165692,
    sk: 248600,
    color: colors.discrete[3],
    more: vt('vote/201907/budget/services/more')
  },
  {
    category: vt('vote/201907/budget/management'),
    label: vt('vote/201907/budget/management/0'),
    pk: 158800,
    sk: 195300,
    color: colors.discrete[4],
    more: vt('vote/201907/budget/management/more')
  },
  {
    category: vt('vote/201907/budget/management'),
    label: vt('vote/201907/budget/management/1'),
    pk: 34300,
    sk: 64000
  }
]

export const total = sum(data, d => +(d.pk + d.sk))

export const grouped = hierarchy({
  children: nest()
    .key(d => d.category)
    .entries(data)
    .map(d => {
      if (d.values.length > 0) {
        return {
          ...d.values[0],
          amount: sum(d.values, v => +(v.pk + v.sk)),
          fraction: sum(d.values, v => +(v.pk + v.sk)) / total,
          pk: sum(d.values, v => +v.pk),
          sk: sum(d.values, v => +v.sk),
          children: d.values.map(c => {
            return {
              ...c,
              amount: c.pk + c.sk,
              fraction: (c.pk + c.sk) / total
            }
          })
        }
      }
      return {
        ...d.values[0],
        amount: d.values[0].pk + d.values[0].sk
      }
    })
}).sum(d => d.Anzahl)
