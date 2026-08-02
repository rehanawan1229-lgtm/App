import { NextResponse } from "next/server"
import { addExpenseRecord } from "@/lib/server-store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const amount = Number(body.amount)
    const category = typeof body.category === "string" ? body.category.trim() : "Other"
    const date = typeof body.date === "string" && body.date ? body.date : new Date().toISOString()

    if (!id || !title || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid expense payload" }, { status: 400 })
    }

    const result = await addExpenseRecord(id, {
      title,
      amount,
      category: category || "Other",
      vendor: typeof body.vendor === "string" ? body.vendor.trim() : undefined,
      status: typeof body.status === "string" ? body.status.trim() || "Pending" : "Pending",
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
      date,
    })

    if (!result) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Expense could not be saved" }, { status: 500 })
  }
}
