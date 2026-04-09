import { NextResponse } from 'next/server';

// ეს ხაზი უმნიშვნელოვანესია - ის ეუბნება Vercel-ს, რომ არ დააქეშიროს პასუხი
export const revalidate = 0; 

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // შენი CSV ბმული
  const SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0-yqc2AoRKGkRKpATKYYfLYliAsKa8D3i2wwumGG4MtLYQEyoaj8cfnDUQEQmNKn5QhVoJdP0TR5U/pub?output=csv";

  try {
    // ვამატებთ დროს ბმულს, რომ Google-მა ყოველთვის ახალი ფაილი მოგვცეს
    const finalUrl = `${SHEETS_CSV_URL}&t=${new Date().getTime()}`;
    
    const response = await fetch(finalUrl, { 
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });

    const csvData = await response.text();
    
    // CSV-ს დაყოფა ხაზებად
    const rows = csvData.split('\n').map(row => row.split(','));
    
    // ვეძებთ ID-ს პირველ სვეტში (row[0])
    const deviceRow = rows.find(row => row[0] && row[0].trim() === id);
    
    // ვიღებთ სტატუსს მეორე სვეტიდან (row[1])
    const status = deviceRow ? deviceRow[1].trim().toLowerCase() : "active";

    return NextResponse.json({ status: status });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ status: "active", error: "Connection failed" });
  }
}