ALTER TABLE "model_predictions" ADD COLUMN "raw_confidence" double precision;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "calibrated_confidence" double precision;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "abstained" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "abstention_reason" text;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD COLUMN "calibration_version" text;