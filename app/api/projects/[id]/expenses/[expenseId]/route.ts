import { NextResponse } from "next/server"
import { updateExpenseRecord, deleteExpenseRecord } from "@/lib/server-store"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  try {
    const { id, expenseId } = await params
    const body = await request.json()

    const patch: Record<string, unknown> = {}
    if (typeof body.title === "string") patch.title = body.title.trim()
    if (body.amount !== undefined && Number.isFinite(Number(body.amount))) patch.amount = Number(body.amount)
    if (typeof body.category === "string") patch.category = body.category.trim()
    if (typeof body.vendor === "string") patch.vendor = body.vendor.trim()
    if (typeof body.status === "string") patch.status = body.status.trim()
    if (typeof body.notes === "string") patch.notes = body.notes.trim()
    if (typeof body.date === "string") patch.date = body.date

    const project = await updateExpenseRecord(id, expenseId, patch)
    if (!project) {
      return NextResponse.json({ error: "Project or expense not found" }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Expense could not be updated" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  try {
    const { id, expenseId } = await params
    const project = await deleteExpenseRecord(id, expenseId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Expense could not be deleted" }, { status: 500 })
  }
}
