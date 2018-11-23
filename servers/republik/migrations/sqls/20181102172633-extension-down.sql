ALTER TABLE "pledgeOptions"
  DROP COLUMN IF EXISTS "customization",
  DROP COLUMN IF EXISTS "id",
  ADD CONSTRAINT "pledgeOptions_pkey" PRIMARY KEY ("templateId", "pledgeId")
;

ALTER TABLE "membershipPeriods"
  DROP COLUMN IF EXISTS "kind",
  DROP COLUMN IF EXISTS "pledgeOptionId"
;

ALTER TABLE "memberships"
  DROP COLUMN IF EXISTS "autoPay"
;

ALTER TABLE "packages"
  DROP COLUMN IF EXISTS "custom",
  DROP COLUMN IF EXISTS "rules"
;
