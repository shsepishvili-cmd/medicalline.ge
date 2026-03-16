import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // აქ მომავალში ბაზას დაუკავშირებ, ახლა კი ხელით ჩაწერე ლოგიკა:
  const devices = {
    "tomo-01": "blocked",
    "tomo-02": "active",
    "tomo-03": "active"
  };

  const status = devices[id] || "active"; // თუ ID ვერ იპოვა, იყოს active

  return NextResponse.json({ status: status });
}