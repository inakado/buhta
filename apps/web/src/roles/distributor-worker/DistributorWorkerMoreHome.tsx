"use client";

import type { CurrentActor } from "../../lib/api-client";
import { AccountMoreSection } from "../../features/account/AccountMoreSection";

type DistributorWorkerMoreHomeProps = {
	actor: CurrentActor;
	logout: () => void;
	logoutPending: boolean;
	onActionSuccess: (message: string) => void;
	online: boolean;
};

export function DistributorWorkerMoreHome({
	actor,
	logout,
	logoutPending,
	onActionSuccess,
	online,
}: DistributorWorkerMoreHomeProps) {
	return (
		<section className="screen-stack director-more-home">
			<h2 className="sr-only">Еще</h2>

			<AccountMoreSection
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onActionSuccess}
				online={online}
				sectionId="distributor-worker-more"
			/>
		</section>
	);
}
