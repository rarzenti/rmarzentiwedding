/*
  Warnings:

  - You are about to drop the column `email` on the `Guest` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Guest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'USA',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street1" TEXT,
ADD COLUMN     "street2" TEXT;

-- AlterTable
ALTER TABLE "public"."Guest" DROP COLUMN "email",
DROP COLUMN "phone";
