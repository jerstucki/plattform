// this code is ready for pledges of package DONATE* have multiple pledgeOptions
// it only expects the pledge.total to be correctly distributed onto its pledgeOptions.total
//
// beware: don't change the price of the pot pledgeOption!! ever!

const Promise = require('bluebird')
const debug = require('debug')('crowdfundings:pot')

const refreshPotForPledgeId = async (pledgeId, customContext) => {
  const { pgdb } = customContext

  const pledgeOptions = await pgdb.public.pledgeOptions.find({
    pledgeId
  })

  const potPledgeOptionIds = pledgeOptions
    .map(plo => plo.potPledgeOptionId)
    .filter(Boolean)
    .filter((id, index, ids) => ids.lastIndexOf(id) === index) // uniq

  if (potPledgeOptionIds.length) {
    await Promise.each(
      potPledgeOptionIds,
      (id) => refreshPot(id, pgdb)
    )
  }
}

const refreshAllPots = async (customContext) => {
  const { pgdb } = customContext

  const potPledgeOptionIds = await pgdb.queryOneColumn(`
    SELECT
      DISTINCT("potPledgeOptionId")
    FROM
      "packageOptions"
    WHERE
      "potPledgeOptionId" IS NOT NULL
  `)

  await Promise.each(
    potPledgeOptionIds,
    (id) => refreshPot(id, pgdb)
  )
}

const refreshPot = async (potPledgeOptionId, pgdb) => {
  const txn = await pgdb.transactionBegin()
  console.log(`transaction ${txn === pgdb}`)
  try {
    const potPledge = await txn.queryOne(`
      SELECT
        *
      FROM
        pledges
      WHERE
        id = (SELECT "pledgeId" FROM "pledgeOptions" WHERE id = :potPledgeOptionId)
      FOR UPDATE
    `, {
      potPledgeOptionId
    })

    const potPledgeOption = await txn.queryOne(`
      SELECT
        *
      FROM
        "pledgeOptions"
      WHERE
        id = :potPledgeOptionId
      FOR UPDATE
    `, {
      potPledgeOptionId
    })

    const totalDonated = await txn.queryOneField(`
      SELECT
        sum(plo.total)
      FROM
        "pledgeOptions" plo
      JOIN
        pledges p
        ON
          plo."pledgeId" = p.id AND
          p.status = 'SUCCESSFUL'
      JOIN
        "pledgePayments" pp
        ON
          p.id = pp."pledgeId"
      JOIN
        payments pay
        ON
          pp."paymentId" = pay.id AND
          pay.status = 'PAID'
      WHERE
        plo."potPledgeOptionId" = :potPledgeOptionId
    `, {
      potPledgeOptionId
    })

    const { price, amount } = potPledgeOption
    const donatedAmountOfMemberships = Math.floor(totalDonated / price)

    const surplusAmountOfDonatedMemberships = donatedAmountOfMemberships - amount

    debug({
      price,
      amount,
      totalDonated: totalDonated / 100,
      donatedAmountOfMemberships,
      surplusAmountOfDonatedMemberships
    })

    if (surplusAmountOfDonatedMemberships > 0) {
      const potPackageOption = await txn.public.packageOptions.findOne({
        id: potPledgeOption.templateId
      })
      const membershipType = await txn.public.membershipTypes.findOne({
        rewardId: potPackageOption.rewardId
      })

      const now = new Date()
      debug(`generating ${surplusAmountOfDonatedMemberships} memberships`)
      await Promise.map(
        Array(surplusAmountOfDonatedMemberships),
        () => txn.public.memberships.insert({
          userId: potPledge.userId,
          pledgeId: potPledge.id,
          membershipTypeId: membershipType.id,
          initialInterval: membershipType.interval,
          initialPeriods: potPledgeOption.periods,
          reducedPrice: false,
          voucherable: false,
          active: false,
          renew: false,
          autoPay: false,
          accessGranted: true,
          createdAt: now,
          updatedAt: now
        })
      )

      await txn.public.pledgeOptions.updateOne(
        { id: potPledgeOptionId },
        {
          amount: amount + surplusAmountOfDonatedMemberships,
          updatedAt: now
        }
      )

      await txn.query(`
        UPDATE
          pledges
        SET
          total = (
            SELECT
              sum(amount * price)
            FROM
              "pledgeOptions"
            WHERE
              "pledgeId" = :potPledgeId
          )
        WHERE
          id = :potPledgeId
      `, {
        potPledgeId: potPledge.id
      })
    }

    await txn.transactionCommit()
  } catch (e) {
    await txn.transactionRollback()
    console.error('transaction rollback', e)
  }
}

module.exports = {
  refreshPotForPledgeId,
  refreshAllPots
}
