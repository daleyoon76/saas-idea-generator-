-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "keyword" TEXT,
    "local_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "one_liner" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "features" TEXT[],
    "differentiation" TEXT NOT NULL,
    "revenue_model" TEXT NOT NULL,
    "mvp_difficulty" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "preset" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "idea_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "idea_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ideas_user_id_created_at_idx" ON "ideas"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "business_plans_user_id_created_at_idx" ON "business_plans"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "business_plans_idea_id_idx" ON "business_plans"("idea_id");

-- CreateIndex
CREATE INDEX "prds_user_id_created_at_idx" ON "prds"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "prds_idea_id_idx" ON "prds"("idea_id");

-- AddForeignKey
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prds" ADD CONSTRAINT "prds_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
