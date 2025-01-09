'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const SignupToggleSchema = z.object({
  enable: z.boolean()
})

export async function toggleSignupAccess(enable: boolean) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      throw new Error("Unauthorized - Admin access required")
    }

    const validated = SignupToggleSchema.parse({ enable })

    await prisma.settings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        allowSignups: validated.enable
      },
      update: {
        allowSignups: validated.enable
      }
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to toggle signup access:', error)
    throw new Error(`Failed to toggle signup access: ${error.message}`)
  }
}

export async function getSignupStatus() {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      throw new Error("Unauthorized - Admin access required")
    }

    const settings = await prisma.settings.findFirst({
      where: { id: "default" }
    })

    return settings?.allowSignups ?? false
  } catch (error: any) {
    console.error('Failed to get signup status:', error)
    throw new Error(`Failed to get signup status: ${error.message}`)
  }
}

