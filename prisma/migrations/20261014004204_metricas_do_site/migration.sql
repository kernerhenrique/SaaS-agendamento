-- CreateTable
CREATE TABLE "SiteMetric" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteMetric_day_idx" ON "SiteMetric"("day");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMetric_day_event_label_key" ON "SiteMetric"("day", "event", "label");
