CREATE TABLE `devotional_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`intention_id` text NOT NULL,
	`devotion_id` text NOT NULL,
	`cycle` integer DEFAULT 1 NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`target` integer NOT NULL,
	`completed_cycles` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`intention_id`) REFERENCES `intentions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devotional_progress_intention_devotion_unique` ON `devotional_progress` (`intention_id`,`devotion_id`);--> statement-breakpoint
CREATE INDEX `devotional_progress_intention_idx` ON `devotional_progress` (`intention_id`);