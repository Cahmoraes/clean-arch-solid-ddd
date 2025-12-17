import { Container } from "inversify"

import { checkInModule } from "./module/check-in/check-in-module"
import { gymModule } from "./module/gym/gym-module"
import { healthCheckModule } from "./module/health-check/heath-check-module"
import { infraModule } from "./module/infra/infra-module"
import { sessionModule } from "./module/session/session-module"
import { subscriptionModule } from "./module/subscription/subscription-module"
import { userModule } from "./module/user/user-module"

export const container = new Container()
container.load(
	userModule,
	gymModule,
	checkInModule,
	infraModule,
	sessionModule,
	healthCheckModule,
	subscriptionModule,
)
