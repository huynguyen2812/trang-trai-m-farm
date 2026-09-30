CREATE TABLE `vaccinations` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`asset_id` text NOT NULL,
	`vaccine_name` text NOT NULL,
	`dose_label` text NOT NULL,
	`administered_at` text NOT NULL,
	`next_due_at` text,
	`batch_number` text NOT NULL,
	`provider` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE INDEX `vaccinations_asset` ON `vaccinations` (`tenant`,`asset_id`,`administered_at`);--> statement-breakpoint
CREATE INDEX `vaccinations_due` ON `vaccinations` (`tenant`,`next_due_at`);