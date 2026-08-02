import { NextResponse } from "next/server"
import { updateTransportRecord, deleteTransportRecord } from "@/lib/server-store"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; transportId: string }> }) {
  try {
    const { id, transportId } = await params
    const body = await request.json()

    const patch: Record<string, unknown> = {}
    if (typeof body.vehicleType === "string") patch.vehicleType = body.vehicleType.trim()
    if (typeof body.route === "string") patch.route = body.route.trim()
    if (body.fuelFreight !== undefined && Number.isFinite(Number(body.fuelFreight))) patch.fuelFreight = Number(body.fuelFreight)
    if (typeof body.driverChallan === "string") patch.driverChallan = body.driverChallan.trim()
    if (typeof body.date === "string") patch.date = body.date
    if (body.totalTransportExpense !== undefined && Number.isFinite(Number(body.totalTransportExpense)))
      patch.totalTransportExpense = Number(body.totalTransportExpense)
    if (typeof body.notes === "string") patch.notes = body.notes.trim()

    const project = await updateTransportRecord(id, transportId, patch)
    if (!project) {
      return NextResponse.json({ error: "Project or transport entry not found" }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Transport expense could not be updated" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; transportId: string }> }) {
  try {
    const { id, transportId } = await params
    const project = await deleteTransportRecord(id, transportId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Transport expense could not be deleted" }, { status: 500 })
  }
}
