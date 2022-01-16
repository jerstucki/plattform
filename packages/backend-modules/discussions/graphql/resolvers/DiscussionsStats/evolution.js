const moment = require('moment')

const { createCache } = require('../../../lib/stats/evolution')

module.exports = async (_, args, context) => {
  // Fetch pre-populated data
  const data = await createCache(context).get()

  // In case pre-populated data is not available...
  if (!data) {
    throw new Error(
      'Unable to retrieve pre-populated data for DiscussionsStats.evolution',
    )
  }

  // Retrieve pre-populated data.
  const { result = [], updatedAt = new Date() } = data

  // A list of desired bucket keys to return
  const keys = []

  // Add keys to bucket keys due to arguments
  for (
    const date = moment(args.min).clone().startOf('month'); // Start with {min}, beginning of months
    date <= moment(args.max); // Loop while date is lower than {max}
    date.add(1, 'month') // Add month to {date} before next loop
  ) {
    keys.push(date.format('YYYY-MM'))
  }

  return {
    buckets: result
      .filter(({ key }) => keys.includes(key))
      .map((r) => ({ ...r, updatedAt })),
    updatedAt,
  }
}