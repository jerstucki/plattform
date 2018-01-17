const MailchimpInterface = require('../MailchimpInterface')
const NewsletterSubscription = require('../NewsletterSubscription')
const { InterestIdNotFoundMailError, RolesNotEligibleMailError } = require('./errors')

const logger = console

module.exports = async ({ user, name, subscribed, status }) => {
  const { roles, email } = user
  const interestId = NewsletterSubscription.interestIdByName(name)

  if (!interestId) {
    throw new InterestIdNotFoundMailError({ name })
  }

  if (!NewsletterSubscription.isEligibleForInterestId(interestId, roles)) {
    throw new RolesNotEligibleMailError({ roles, interestId })
  }

  const body = {
    interests: {
      [interestId]: !!subscribed
    }
  }

  // If a user subscribes to a newsletter but their status is not subscribed,
  // we need to set their status to 'pending' which triggers a new confirmation email
  // from mailchimp to re-subscribe.
  if (subscribed && status !== 'subscribed') {
    body.email_address = email
    body.status = 'pending'
  }

  const mailchimp = new MailchimpInterface({ logger })
  await mailchimp.updateMember(email, body)
  return new NewsletterSubscription(user.id, interestId, subscribed, roles)
}
