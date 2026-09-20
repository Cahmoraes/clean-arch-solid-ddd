import { z } from "zod"
import { NOTIFICATION_TYPE_VALUES } from "@/notification/domain/notification.js"

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPE_VALUES)
