// The error an adapter raises when update() targets a record that does not exist.
export type MissingRecordErrorClass = abstract new (...args: never[]) => Error
