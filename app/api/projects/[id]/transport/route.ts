import { NextResponse } from "next/server"
import { addTransportRecord } from "@/lib/server-store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const route = typeof body.route === "string" ? body.route.trim() : ""
    const fuelFreight = Number(body.fuelFreight)
    const date = typeof body.date === "string" && body.date ? body.date : new Date().toISOString()

    if (!id || !route || !Number.isFinite(fuelFreight) || fuelFreight <= 0) {
      return NextResponse.json({ error: "Invalid transport expense payload" }, { status: 400 })
    }

    const result = await addTransportRecord(id, {
      vehicleType: typeof body.vehicleType === "string" ? body.vehicleType.trim() : "",
      route,
      fuelFreight,
      driverChallan: typeof body.driverChallan === "string" ? body.driverChallan.trim() : "",
      date,
      totalTransportExpense: Number.isFinite(Number(body.totalTransportExpense)) ? Number(body.totalTransportExpense) : fuelFreight,
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    })

    if (!result) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Transport expense could not be saved" }, { status: 500 })
  }
}
