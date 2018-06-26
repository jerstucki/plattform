const { Roles } = require('@orbiting/backend-modules-auth')
const { publishMonitor } = require('../../../../../lib/slack')

const cancelPledge = require('./cancelPledge')
const deleteStripeCustomer = require('../../../lib/payments/stripe/deleteCustomer')

const deleteRelatedData = async (userId, pgdb) => {
  // get all related tables
  // https://stackoverflow.com/questions/5347050/sql-to-list-all-the-tables-that-reference-a-particular-column-in-a-table
  const keepRelations = [ 'pledges', 'stripeCustomers' ]
  const relations = await pgdb.query(`
    select
      R.TABLE_SCHEMA as schema,
      R.TABLE_NAME as table
    from INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE u
    inner join INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS FK
      on U.CONSTRAINT_CATALOG = FK.UNIQUE_CONSTRAINT_CATALOG
      and U.CONSTRAINT_SCHEMA = FK.UNIQUE_CONSTRAINT_SCHEMA
      and U.CONSTRAINT_NAME = FK.UNIQUE_CONSTRAINT_NAME
    inner join INFORMATION_SCHEMA.KEY_COLUMN_USAGE R
      on R.CONSTRAINT_CATALOG = FK.CONSTRAINT_CATALOG
      and R.CONSTRAINT_SCHEMA = FK.CONSTRAINT_SCHEMA
      and R.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
    where
      U.TABLE_NAME = 'users'
  `)
    .then(rels => rels
      .filter(rel => keepRelations.indexOf(rel.table) === -1)
    )
  relations.unshift({ // needs to be first
    schema: 'public',
    table: 'discussionPreferences'
  })
  relations.push({ // needs to be last
    schema: 'public',
    table: 'eventLog'
  })
  return Promise.all([
    pgdb.query(`
      DELETE
        FROM sessions s
      WHERE
        ARRAY[(s.sess #>> '{passport, user}')::uuid] && :userIds
    `, {
      userIds: [ userId ]
    }),
    ...relations.map(rel =>
      pgdb[rel.schema][rel.table].delete({
        userId // assume the foreign column is always called userId
      })
    )
  ])
}

const getNulledColumnsForUsers = async (pgdb) => {
  const keepColumns = [ 'firstName', 'lastName', 'addressId', 'createdAt', 'updatedAt' ]
  return pgdb.queryOneColumn(`
    SELECT
      column_name
    FROM information_schema.columns
    WHERE
      table_name = 'users' AND
      is_nullable = 'YES'
  `)
    .then(columns => columns
      .filter(column => keepColumns.indexOf(column) === -1)
      .reduce(
        (acc, column) => ({
          ...acc,
          [column]: null
        }),
        {}
      )
    )
}

module.exports = async (_, args, context) => {
  const {
    userId
  } = args
  const {
    pgdb,
    req,
    t,
    mail: { deleteEmail: deleteFromMailchimp }
  } = context
  Roles.ensureUserHasRole(req.user, 'admin')

  const transaction = await pgdb.transactionBegin()
  try {
    const user = await transaction.public.users.findOne({
      id: userId
    })
    if (!user) {
      throw new Error(t('api/users/404'))
    }

    const pledges = await transaction.public.pledges.find({
      userId
    })
    const memberships = await transaction.query(`
      SELECT
        m.*,
        json_agg(p.*) as pledges
      FROM memberships m
      JOIN pledges p
        ON m."pledgeId" = p.id
      WHERE
        m."userId" = :userId
      GROUP BY
        m.id
    `, {
      userId
    })

    // returning claimed memberships not supported yet
    const claimedMemberships = memberships.filter(m => !!m.pledges.find(p => p.userId !== userId))
    if (claimedMemberships.length > 0) {
      throw new Error(t('api/users/delete/claimedMembershipsNotSupported'))
    }

    // delete from mailchimp
    await deleteFromMailchimp({
      email: user.email
    })

    await deleteRelatedData(userId, transaction)

    // if the user had pledges we can delete everything,
    // otherwise we need to keep (firstName, lastName, address) for bookkeeping
    const deleteCompletely = pledges.length === 0
    if (deleteCompletely) {
      // delete stripe data
      await deleteStripeCustomer({ userId, pgdb: transaction })

      await transaction.public.users.deleteOne({
        id: userId
      })
    } else {
      // cancel pledges
      await Promise.all(
        pledges.map(p => cancelPledge(null, {
          pledgeId: p.id,
          transaction,
          skipEnforceSubscriptions: true
        }, context))
      )
      // null profile where possible
      // change email to uid_deleted@republik.ch
      const nulledColumns = await getNulledColumnsForUsers(transaction)
      await transaction.public.users.updateOne(
        {
          id: userId
        },
        {
          email: `${user.id}_deleted@republik.ch`,
          hasPublicProfile: false,
          isListed: false,
          isAdminUnlisted: true,
          isPhoneNumberVerified: false,
          isTOTPChallengeSecretVerified: false,
          ...nulledColumns
        }
      )
    }

    await transaction.transactionCommit()

    await publishMonitor(
      req.user,
      `deleteUser *${user.firstName} ${user.lastName} - ${user.email}*`
    )

    return deleteCompletely
      ? null
      : pgdb.public.users.findOne({
        id: userId
      })
  } catch (e) {
    await transaction.transactionRollback()
    console.info('transaction rollback', { req: req._log(), args, error: e })
    throw e
  }
}
