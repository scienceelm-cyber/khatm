CREATE TABLE `intentions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 100 NOT NULL,
	`quran_cycle` integer DEFAULT 1 NOT NULL,
	`completed_quran_khatms` integer DEFAULT 0 NOT NULL,
	`salawat_cycle` integer DEFAULT 1 NOT NULL,
	`salawat_current` integer DEFAULT 0 NOT NULL,
	`salawat_target` integer DEFAULT 14000 NOT NULL,
	`completed_salawat_khatms` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quran_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`intention_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`ayah_number` integer NOT NULL,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`assigned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` integer NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`intention_id`) REFERENCES `intentions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quran_claims_active_ayah_unique` ON `quran_claims` (`intention_id`,`cycle`,`ayah_number`) WHERE "quran_claims"."status" = 'assigned';--> statement-breakpoint
CREATE UNIQUE INDEX `quran_claims_completed_ayah_unique` ON `quran_claims` (`intention_id`,`cycle`,`ayah_number`) WHERE "quran_claims"."status" = 'completed';--> statement-breakpoint
CREATE INDEX `quran_claims_session_idx` ON `quran_claims` (`session_id`,`intention_id`,`cycle`,`status`);--> statement-breakpoint
CREATE INDEX `quran_claims_expiry_idx` ON `quran_claims` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `quran_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intention_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`intention_title` text NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`intention_id`) REFERENCES `intentions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quran_history_cycle_unique` ON `quran_history` (`intention_id`,`cycle`);