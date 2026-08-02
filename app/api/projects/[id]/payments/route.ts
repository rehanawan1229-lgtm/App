import { NextResponse } from "next/server"
import { addPaymentRecord } from "@/lib/server-store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const amount = Number(body.amount)
    const voucherId = typeof body.voucherId === "string" ? body.voucherId.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""
    const timestamp = typeof body.timestamp === "string" ? body.timestamp : new Date().toISOString()

    if (!id || !Number.isFinite(amount) || amount <= 0 || !voucherId || !description) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 })
    }

    const result = await addPaymentRecord(id, { amount, voucherId, description, timestamp })
    if (!result) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Payment could not be saved" }, { status: 500 })
  }
}
