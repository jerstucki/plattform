#!/usr/bin/env node
require('@orbiting/backend-modules-env').config()

const fetch = require('node-fetch')
const Promise = require('bluebird')
const url = require('url')
const yargs = require('yargs')

const argv = yargs
  .option('data-url', { alias: 'd', required: true, coerce: url.parse })
  .option('mapping-url', { alias: 'm', required: true, coerce: url.parse })
  .option('mock', { alias: 't', default: false })
  .argv

const PgDb = require('@orbiting/backend-modules-base/lib/PgDb')

const districtMap = {
  'Aargau': 'Aargau',
  'Appenzell Ausserrhoden': 'Appenzell Ausserrhoden',
  'Appenzell Innerrhoden': 'Appenzell Innerrhoden',
  'Basel-Landschaft': 'Basel-Landschaft',
  'Basel-Stadt': 'Basel-Stadt',
  'Bern / Berne': 'Bern',
  'Fribourg / Freiburg': 'Freiburg',
  'Genève': 'Genf',
  'Glarus': 'Glarus',
  'Graubünden / Grigioni / Grischun': 'Graubünden',
  'Jura': 'Jura',
  'Luzern': 'Luzern',
  'Neuchâtel': 'Neuenburg',
  'Nidwalden': 'Nidwalden',
  'Obwalden': 'Obwalden',
  'Schaffhausen': 'Schaffhausen',
  'Schwyz': 'Schwyz',
  'Solothurn': 'Solothurn',
  'St. Gallen': 'St. Gallen',
  'Thurgau': 'Thurgau',
  'Ticino': 'Tessin',
  'Uri': 'Uri',
  'Valais / Wallis': 'Wallis',
  'Vaud': 'Waadt',
  'Zug': 'Zug',
  'Zürich': 'Zürich'
}

const sanitize = (string) => {
  return string
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 4)
    .toLowerCase()
    .trim()
}

const maybeTrue = (probability) => Math.random() < probability

PgDb.connect().then(async pgdb => {
  if (argv.mock) {
    console.warn('WARNING: Data mocking enabled, remove --mock flag.')
  }

  const dataRaw = await fetch(argv['data-url'])
    .then(res => {
      if (!res.ok) {
        throw Error(`Unable to fetch data-url "${url.format(argv['data-url'])}" (HTTP Status Code: ${res.status})`)
      }

      return res.text()
    })

  const { kandidierende } = JSON.parse(dataRaw.trim())

  /**
    {
      "bfsUid": "25-10-1",
      "cardId": "140cd3df-d98c-4a77-9621-9c12c98cf813"
    },
   */
  const bfsMapping = await fetch(argv['mapping-url'])
    .then(res => {
      if (!res.ok) {
        throw Error(`Unable to fetch data-url "${url.format(argv['data-url'])}" (HTTP Status Code: ${res.status})`)
      }

      return res.json()
    })

  const cardGroups = await pgdb.public.cardGroups.findAll()
  const cards = (await pgdb.public.cards.findAll())
    .map(r => {
      r.group = cardGroups.find(cardGroup => cardGroup.id === r.cardGroupId)

      return r
    })

  const stats = { mismatched: 0, tooMany: 0, none: 0 }
  const mock = { elects: 200, probability: 1 / kandidierende.length * 200 }

  await Promise.each(
    kandidierende,
    async (k, index) => {
      const bfsUid = `${k.kanton_nummer}-${k.liste_nummer_kanton}-${k.kandidat_nummer}`

      if (k._matched) {
        throw new Error(`matchend twice, bfsUid "${bfsUid}"`)
      }

      /**
       * Kandidierende SR INT 2
        {
          kanton_nummer: 1,
          kanton_bezeichnung: 'Zürich',
          liste_nummer_kanton: '2',
          liste_bezeichnung: 'Sozialdemokratische Partei (SP)',
          kandidat_nummer: 2,
          kandidat_listenplatz_1: 2,
          kandidat_listenplatz_2: null,
          name: 'Seiler Graf',
          vorname: 'Priska',
          geschlecht: 'F',
          geburtsdatum: '29.08.1968',
          geburtsjahr: 1968,
          wohnort_gemeinde_nummer: 62,
          wohnort: 'Kloten',
          beruf: 'Stadträtin',
          kandidat_status_id: 2,
          kandidat_partei_id: 3,
          flag_gewaehlt: false,
          stimmen_kandidat: null
        }
      */

      const { cardId } = bfsMapping.find(b => b.bfsUid === bfsUid)
      const mappedCards = cards.filter(c => c.id === cardId)
      const bfsUidCards = cards.filter(c => c.payload.meta.bfsUid === bfsUid)

      const matchedCards = cards
        .filter(c => c.group.name === districtMap[k.kanton_bezeichnung])
        .filter(c => {
          const cFirstName = sanitize(c.payload.meta.firstName)
          const cLastName = sanitize(c.payload.meta.lastName)

          const kFirstName = sanitize(k.vorname)
          const kLastName = sanitize(k.name)

          const cName = `${cFirstName} ${cLastName}`
          const cNameInvert = `${cLastName} ${cFirstName}`
          const kName = `${kFirstName} ${kLastName}`

          return cName === kName || cNameInvert === kName
        })
        .filter((c, index, array) => array.length === 1 || c.payload.yearOfBirth === k.geburtsjahr)

      const card =
        (mappedCards.length === 1 && mappedCards[0]) ||
        (bfsUidCards.length === 1 && bfsUidCards[0]) ||
        (matchedCards.length === 1 && matchedCards[0])

      kandidierende[index]._bfsUid = bfsUid

      if (!card) {
        stats.mismatched++

        kandidierende[index]._matched = false

        console.log([ k._bfsUid, districtMap[k.kanton_bezeichnung], k.vorname, k.name, k.liste_bezeichnung ].join('\t'))

        if (matchedCards.length > 1) stats.tooMany++
        if (matchedCards.length === 0) stats.none++
      } else {
        const { id, payload } = card

        kandidierende[index]._matched = true
        kandidierende[index]._cardId = id

        let elected = !!k.flag_gewaehlt
        let votes = +k.stimmen_kandidat

        if (argv.mock) {
          elected = false
          votes = Math.round(Math.random() * 10000)

          if (mock.elects > 0 && maybeTrue(mock.probability)) {
            elected = true
            mock.elects--
          }
        }

        const updatedPayload = {
          ...payload,
          meta: {
            ...payload.meta,
            bfsUid
          },
          nationalCouncil: {
            ...payload.nationalCouncil,
            elected,
            votes
          }
        }

        await pgdb.public.cards.updateOne(
          { id },
          { payload: updatedPayload }
        )
      }
    })

  console.log('Done.', { stats, matched: kandidierende.filter(k => k._matched).length })

  await pgdb.close()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
