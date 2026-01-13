export class UserHasAlreadyCheckedInToday extends Error {
	constructor() {
		super("User has already checked in today")
		this.name = "UserHasAlreadyCheckedInToday"
	}
}
