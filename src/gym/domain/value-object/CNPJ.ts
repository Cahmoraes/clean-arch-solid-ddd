import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { ValueObject } from "@/shared/domain/value-object/value-object"

import { InvalidCNPJError } from "../error/invalid-cnpj-error"

export class CNPJ implements ValueObject {
	private readonly _value: string

	constructor(aString: string) {
		this._value = aString
	}

	public static create(aString: string): Either<InvalidCNPJError, CNPJ> {
		if (!CNPJ.isValid(aString)) {
			return failure(new InvalidCNPJError("Invalid CNPJ"))
		}
		return success(new CNPJ(aString))
	}

	public static restore(aString: string) {
		return new CNPJ(aString)
	}

	get value(): string {
		return this._value
	}

	/**
	 * Valida um CNPJ brasileiro
	 * @param aString - CNPJ a ser validado (com ou sem formatação)
	 * @returns true se o CNPJ for válido, false caso contrário
	 */
	private static isValid(aString: string): boolean {
		if (!aString) return false
		// Remove caracteres não numéricos
		const cleanCnpj = aString.replace(/\D/g, "")
		// Verifica se tem 14 dígitos
		if (cleanCnpj.length !== 14) return false
		// Verifica se todos os dígitos são iguais
		if (/^(\d)\1{13}$/.test(cleanCnpj)) return false
		return CNPJ.validateDigits(cleanCnpj)
	}

	/**
	 * Valida os dígitos verificadores do CNPJ
	 */
	private static validateDigits(aString: string): boolean {
		// Primeiro dígito verificador
		const firstDigit = CNPJ.calculateDigit(
			aString.slice(0, 12),
			[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
		)
		if (parseInt(aString[12], 10) !== firstDigit) return false

		// Segundo dígito verificador
		const secondDigit = CNPJ.calculateDigit(
			aString.slice(0, 13),
			[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
		)
		if (parseInt(aString[13], 10) !== secondDigit) return false

		return true
	}

	/**
	 * Calcula um dígito verificador
	 */
	private static calculateDigit(digits: string, weights: number[]): number {
		const sum = digits
			.split("")
			.reduce(
				(acc, digit, index) => acc + parseInt(digit, 10) * weights[index],
				0,
			)

		const remainder = sum % 11
		return remainder < 2 ? 0 : 11 - remainder
	}

	/**
	 * Formata um CNPJ adicionando pontos, barra e hífen
	 * @param aString - CNPJ sem formatação
	 * @returns CNPJ formatado (XX.XXX.XXX/XXXX-XX)
	 */
	public static format(aString: string): string {
		const cleanCnpj = aString.replace(/\D/g, "")
		if (cleanCnpj.length !== 14) {
			throw new Error("CNPJ deve conter exatamente 14 dígitos")
		}
		return cleanCnpj.replace(
			/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
			"$1.$2.$3/$4-$5",
		)
	}

	/**
	 * Remove a formatação do CNPJ
	 * @param aString - CNPJ formatado
	 * @returns CNPJ apenas com números
	 */
	public static clean(aString: string): string {
		return aString.replace(/\D/g, "")
	}

	public equals(other: unknown): boolean {
		if (!(other instanceof CNPJ)) return false
		return other._value === this._value
	}
}
