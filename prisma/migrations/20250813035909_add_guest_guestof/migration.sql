-- CreateEnum
CREATE TYPE "public"."GuestOf" AS ENUM ('RYAN', 'MARSHA');

-- AlterTable
ALTER TABLE "public"."Guest" ADD COLUMN     "guestOf" "public"."GuestOf";
