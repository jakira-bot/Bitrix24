import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'


export async function POST(req: NextRequest) {
    const { id } = await req.json()

    const deal = await prisma.deal.findUnique({ where: { id } })


    //const res = await fetch(`https://api.example.com/info/${deal.industry}`)
    //const apiData = await res.json()
    const test = { "test1": "A", "test2": "B"}

    
    const updatedDeal = await prisma.deal.update({
        where: { id },
        data: { apiData: test },
    })

    return NextResponse.json(updatedDeal)
}
