import type { Distance } from "../value-object/distance"
import type { Specification } from "./specification"

export class MaxDistanceSpecification implements Specification<Distance> {
	private static readonly MAX_DISTANCE_IN_KM = 0.1

	public isSatisfiedBy(distance: Distance): boolean {
		return distance.value > MaxDistanceSpecification.MAX_DISTANCE_IN_KM
	}
}
